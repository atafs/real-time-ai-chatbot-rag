const express = require("express");
const { Server } = require("socket.io");
const http = require("http");
const pdfParse = require("pdf-parse");
const multer = require("multer");
const cors = require("cors");
require("dotenv").config();
const logger = require("./logger");
const { setupSocket } = require("./socket");
const { getPineconeClient, initializePinecone } = require("./api/pinecone");

// Validate environment variables
const requiredEnvVars = [
  "PINECONE_API_KEY",
  "XAI_API_KEY",
  "HUGGINGFACE_API_KEY",
];
const missingEnvVars = requiredEnvVars.filter(
  (varName) => !process.env[varName]
);
if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing environment variables: ${missingEnvVars.join(", ")}`
  );
}

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

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"), false);
    }
  },
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

app.post("/upload", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      logger.warn("No PDF file uploaded");
      return res.status(400).json({ error: "No PDF file uploaded" });
    }

    const pdfText = await pdfParse(req.file.buffer);
    if (!pdfText.text || pdfText.text.trim() === "") {
      logger.warn("PDF contains no extractable text");
      return res
        .status(400)
        .json({ error: "PDF contains no extractable text" });
    }

    if (pdfText.text.length < 100) {
      logger.warn("PDF has minimal extractable text", {
        textLength: pdfText.text.length,
      });
    }

    logger.info("PDF processed", {
      textLength: pdfText.text.length,
      sampleText: pdfText.text.slice(0, 100),
    });

    // Improved chunking with overlap
    const sentences = pdfText.text
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.trim());
    const textChunks = [];
    let currentChunk = "";
    const maxChunkSize = 512;
    const overlapSize = 50;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      if (currentChunk.length + sentence.length <= maxChunkSize) {
        currentChunk += sentence + " ";
      } else {
        textChunks.push(currentChunk.trim());
        logger.info("Chunk created", {
          chunk: currentChunk.trim(),
          length: currentChunk.trim().length,
          chunkIndex: textChunks.length,
        });
        currentChunk =
          sentences[Math.max(0, i - 1)].slice(-overlapSize) + sentence + " ";
      }
    }
    if (currentChunk) {
      textChunks.push(currentChunk.trim());
      logger.info("Final chunk created", {
        chunk: currentChunk.trim(),
        length: currentChunk.trim().length,
        chunkIndex: textChunks.length,
      });
    }

    logger.info("Processing chunks", { chunkCount: textChunks.length });

    // Generate embeddings for chunks
    const { generateEmbedding } = require("./api/huggingface");
    const embeddingPromises = textChunks.map(async (chunk, index) => {
      try {
        const embedding = await generateEmbedding(chunk);
        logger.info("Embedding generated", {
          chunkIndex: index,
          embeddingLength: embedding.length,
        });
        return embedding;
      } catch (error) {
        logger.error("Failed to generate embedding for chunk", {
          chunkIndex: index,
          chunk: chunk.slice(0, 50),
          error: error.message,
        });
        throw error;
      }
    });
    const embeddingVectors = await Promise.all(embeddingPromises);

    // Average embeddings
    const avgEmbedding =
      embeddingVectors.length === 1
        ? embeddingVectors[0]
        : embeddingVectors[0].map(
            (_, i) =>
              embeddingVectors.reduce((sum, vec) => sum + vec[i], 0) /
              embeddingVectors.length
          );

    // Upsert to Pinecone
    try {
      const docId = Date.now().toString();
      await pinecone.index("docs").upsert([
        {
          id: docId,
          values: avgEmbedding,
          metadata: { text: pdfText.text.slice(0, 1000) }, // Limit metadata size
        },
      ]);
      logger.info("Document upserted to Pinecone", { id: docId });
    } catch (error) {
      logger.error("Pinecone upsert failed", { error: error.message });
      throw new Error(`Pinecone upsert failed: ${error.message}`);
    }

    logger.info("Document processed and upserted to Pinecone");
    res.json({ message: "Document processed" });
  } catch (error) {
    logger.error("Upload error", { error: error.message, stack: error.stack });
    res
      .status(500)
      .json({ error: "Processing failed", details: error.message });
  }
});

// Initialize Socket.IO handlers
setupSocket(io, pinecone);

server.listen(4000, () => {
  logger.info("Server started on http://localhost:4000");
  logger.info("Test log to verify logger is working");
});
