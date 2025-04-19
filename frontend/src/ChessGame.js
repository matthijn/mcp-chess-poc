import React, {useEffect, useState} from "react";
import { Chessboard } from "react-chessboard";
import axios from "axios";

const defaultBoard = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
const ChessGame = () => {

    const [board, setBoard] = useState(defaultBoard);

    const introVisible = board === defaultBoard

    // Function to get the turn from a FEN string
    const getTurnFromFEN = (fen = board) => {
        if (!fen) return null; // Handle empty or invalid FEN
        const fields = fen.split(" "); // Split the FEN string by spaces
        return fields[1] === "w" ? "white" : "black"; // Return "White" or "Black" based on the 2nd field
    };


    // Function to get the round (full-move number) from a FEN string
    const getRoundFromFEN = (fen = board) => {
        if (!fen) return null; // Handle empty or invalid FEN
        const fields = fen.split(" "); // Split the FEN string by spaces
        return parseInt(fields[5], 10); // Return the 6th field as an integer, which represents the round
    };


    // Function to fetch the board state from the backend
    const fetchBoardState = async () => {
        try {
            const response = await axios.get("http://localhost:5008/api/get-board");
            setBoard(response.data.board); // Update the board state
        } catch (error) {
            console.error("Error fetching board state:", error);
        }
    };

    // Periodically fetch the board state
    useEffect(() => {
        axios.get("http://localhost:5008/api/reset-board").then(() => fetchBoardState());
        const interval = setInterval(fetchBoardState, 500); // Fetch every second
        return () => clearInterval(interval); // Cleanup interval on component unmount
    }, []);

    // Handle user move
    const onDrop = async (sourceSquare, targetSquare) => {
        if (getTurnFromFEN() === "white") {
            // Update the board state for the player's move
            const move = { from: sourceSquare, to: targetSquare };
            const response = await axios.post("http://localhost:5008/api/make-move", { move, board });
            setBoard(response.data.board)
        }
    };

    const turnMessage = getTurnFromFEN() === "white" ? "Your turn" : getRoundFromFEN() === 1 ? "Tell AI to play" : "AI's thinking..."

    return (
        <div>
            <h1>LLM Chess</h1>
            <p style={ introVisible ? { display: "block" } : { display: "none"}}>
                Make your first move. Then tell the LLM it's time to play chess and they play as black.
            </p>
            <div style={{ width: 400, height: 400, margin: "auto" }}>
                <Chessboard
                    position={board}
                    onPieceDrop={onDrop}
                    arePiecesDraggable={getTurnFromFEN() === "white"} // Allow dragging only on player's turn
                />
            </div>
            <p style={!introVisible ? { display: 'block'} : { display: 'none'} }>{turnMessage}</p>
        </div>
    );
};

export default ChessGame;
