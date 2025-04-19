#!/usr/bin/env node

import {Server} from "@modelcontextprotocol/sdk/server/index.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListPromptsRequestSchema,
    ListToolsRequestSchema,
    Resource,
    Tool
} from "@modelcontextprotocol/sdk/types.js";

// Debug helper function that logs to stderr
const debug = (message: string, data: any = null): void => {
    const output = data ? `${message}: ${JSON.stringify(data, null, 2)}` : message;
    console.error(`[DEBUG] ${output}`);
};

const CHESS_PROMPTS = [
    {
        id: "get_board_state",
        name: "Get board state",
        description: "Analyze the current board position and determine a move.",
        content: "Given the current board state, analyze the position and make the best move."
    },
    {
        id: "explain_move",
        name: "Explain Move",
        description: "Make a move and explain the reasoning",
        content: "Make a move on the current board and explain your strategic reasoning."
    }
];

const outputSchema = {
    type: "object",
    properties: {
        valid: {
            type: "boolean",
            description: "Whether the given input gave a valid output"
        },
        board: {
            type: "string",
            description: "FEN notation of the current board state"
        },
        currentPlayer: {
            type: "string",
            description: "Current player"
        },
        prompt: {
            type: "string",
            description: "An optional prompt with further instructions"
        }
    },
    required: ["valid"]
}

const CHESS_MOVE_TOOL: Tool = {
    name: "chess_move",
    description:
        "Makes a move in the chess game using from and to square coordinates",
    inputSchema: {
        type: "object",
        properties: {
            from: {
                type: "string",
                description: "Source square (e.g. 'e2')"
            },
            to: {
                type: "string",
                description: "Destination square (e.g. 'e4')"
            },
        },
        required: ["from", "to"],
    },
    outputSchema
};

const CHESS_BOARD_TOOL: Resource = {
    name: "chess_board",
    description: "Gets the current state of the chess board",
    inputSchema: {
        type: "object",
        properties: {},
        required: []
    },
    outputSchema
};

const API_URL = 'http://localhost:5008/api';

async function waitForPlayer(player: string): Promise<object> {
    let result: { currentPlayer: string, board: string }
    do {
        await waitForMS(1000)

        const response = await fetch(`${API_URL}/get-board`);
        result = await response.json()

        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }

    }
    while(result.currentPlayer === 'white')

    return result
}

async function waitForMS(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Make a move on the chess board
const makeMove = async (moveNotation: any): Promise<any> => {
    try {
        const response = await fetch(`${API_URL}/make-move`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ move: moveNotation })
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }

        const result = await response.json();
        return await waitForPlayer("white");
    } catch (error) {
        debug("Failed to make move", error.message);
        throw error;
    }
};

// Get the current board state
const getBoardState = async (): Promise<any> => {
    try {
        const response = await fetch(`${API_URL}/get-board`);
        return await response.json();
    } catch (error) {
        debug("Failed to get board state", error.message);
        throw error;
    }
};

// Server implementation
const server = new Server(
    {
        name: "chess",
        version: "0.1.0",
    },
    {
        capabilities: {
            tools: {},
            resources: {},
            prompts: {}
        },
    },
);

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async (request: any) => {
    return {
        tools: [CHESS_MOVE_TOOL, CHESS_BOARD_TOOL],
        resources: [],
    };
});

server.setRequestHandler(ListPromptsRequestSchema, async (request: any) => {
    return {prompts: CHESS_PROMPTS};
});

server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
    debug("Handling CallTool request", request);
    const { name, arguments: args } = request.params;
    let response;

    // Handle chess_move tool
    if (name === "chess_move") {
        try {
            const result = await makeMove(args);
            response = {
                content: [{ type: "text", text: JSON.stringify(result) }],
                result
            };
        } catch (error) {
            response = {
                error: {
                    message: error.message
                }
            };
        }
    }
    // Handle chess_board resource
    else if (name === "chess_board") {
        try {
            const boardState = await getBoardState();
            response = {
                content: [{ type: "text", text: JSON.stringify(boardState) }],
                result: boardState
            };
        } catch (error) {
            response = {
                error: {
                    message: error.message
                }
            };
        }
    }
    // If the tool/resource is not recognized
    else {
        response = {
            error: {
                message: `Unknown tool or resource: ${name}`
            }
        };
    }

    debug("CallTool response", response);
    return response;
});

async function runServer() {
    debug("Starting server");
    const transport = new StdioServerTransport();
    await server.connect(transport);
    debug("Chess MCP Server running on stdio");
}

runServer().catch((error: Error) => {
    debug("Fatal error running server", error.message);
    process.exit(1);
});