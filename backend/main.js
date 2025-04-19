const express = require("express");
const bodyParser = require("body-parser");
const { Chess } = require("chess.js");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(bodyParser.json());

const defaultBoard = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
let board = defaultBoard;
let chess = new Chess(); // Initialize a new chess game
chess.load(defaultBoard)

const getTurnFromFEN = (fen = board) => {
    if (!fen) return null; // Handle empty or invalid FEN
    const fields = fen.split(" "); // Split the FEN string by spaces
    return fields[1] === "w" ? "white" : "black"; // Return "White" or "Black" based on the 2nd field
};

function buildOutput(valid, fen, prompt) {
    return {
        board: fen,
        currentPlayer: getTurnFromFEN(fen),
        valid,
        prompt
    }
}

// Endpoint to make a move
app.post("/api/make-move", (req, res) => {
    const { move } = req.body;

    console.log(`Received move from player: ${JSON.stringify(move)}`);

    try {
        console.log(`Move is valid. Updated board state: ${chess.fen()}`);
        const result = chess.move(move); // Attempt the move
        res.json(buildOutput(result, chess.fen(), `Play another move as ${getTurnFromFEN(chess.fen())}. Explain your reasoning. I want to learn.`));
    }
    catch (error) {
        console.log(`Move is invalid.`);
        res.json(buildOutput(false, chess.fen(), `Play another move as ${getTurnFromFEN(chess.fen())}. Explain your reasoning. I want to learn.`));
    }
});

app.get("/api/reset-board", (req, res) => {
    console.log("Resetting current board state.");
    chess.load(defaultBoard)
    res.json(buildOutput(true, chess.fen(), `A new game has started`));
});

app.get("/api/get-board", (req, res) => {
    const state = buildOutput(true, chess.fen(), `Current board state`)
    res.json(state);
});

// Start the server
const PORT = 5008;
app.listen(PORT, () => {
    console.log(`HTTP Server running on http://localhost:${PORT}`);
});
