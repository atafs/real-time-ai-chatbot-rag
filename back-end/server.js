const express = require("express");
const { Server } = require("socket.io");
const http = require("http");
const cors = require("cors");
require("dotenv").config();
const logger = require("./logger");
const { setupSocket } = require("./socket");
const { getPineconeClient, initializePinecone } = require("./api/pinecone");
const uploadEndpoint = require("./endpoints/upload");

const app = express();
const server = http.createServer(app);

// Configure Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Get Pinecone client
const pinecone = getPineconeClient();

// Initialize Pinecone index
initializePinecone().catch((err) => {
  logger.error("Server startup failed due to Pinecone error", {
    error: err.message,
  });
  process.exit(1);
});

// Enable CORS for Express
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.static("../public"));

// Register upload endpoint
app.use(uploadEndpoint);

// Initialize Socket.IO handlers
setupSocket(io, pinecone);

server.listen(4000, () => {
  logger.info("Server started on http://localhost:4000");
  logger.info("Test log to verify logger is working");
});
