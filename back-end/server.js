const express = require("express");
const { Server } = require("socket.io");
const http = require("http");
const pdfParse = require("pdf-parse");
const { Pinecone } = require("@pinecone-database/pinecone");
const multer = require("multer");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();
const logger = require("./logger");

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

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

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

// Generate embeddings using Hugging Face Inference API
async function generateEmbedding(text) {
  try {
    if (!text || typeof text !== "string" || text.trim() === "") {
      logger.error("Invalid input for embedding", { text });
      throw new Error("Invalid or empty input text");
    }

    const response = await axios.post(
      "https://api-inference.huggingface.co/models/BAAI/bge-small-en-v1.5",
      { inputs: [text] },
      {
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 10000, // 10s timeout
      }
    );

    // Handle API response
    let embedding = response.data;
    if (Array.isArray(embedding) && Array.isArray(embedding[0])) {
      embedding = embedding[0]; // Single input returns [[vector]]
    } else if (Array.isArray(embedding)) {
      // Direct vector
    } else {
      logger.error("Unexpected embedding response format", {
        response: response.data,
      });
      throw new Error("Unexpected response format from Hugging Face API");
    }

    if (!embedding || embedding.length !== 384) {
      logger.error("Invalid embedding format", {
        length: embedding?.length,
        response: response.data,
      });
      throw new Error(
        `Invalid embedding format: expected 384 dimensions, got ${
          embedding?.length || "unknown"
        }`
      );
    }

    return embedding;
  } catch (error) {
    const errorDetails = error.response?.data || {};
    const status = error.response?.status;
    logger.error("Hugging Face API error", {
      error: error.message,
      status,
      details: errorDetails,
      text: text.slice(0, 50),
    });

    if (status === 401 || errorDetails.error?.includes("Invalid credentials")) {
      throw new Error(
        "Invalid Hugging Face API key. Please check HUGGINGFACE_API_KEY in .env."
      );
    }
    if (status === 404) {
      throw new Error(
        "Hugging Face model endpoint not found. Verify the model is available."
      );
    }
    if (errorDetails.error?.includes("SentenceSimilarityPipeline")) {
      throw new Error(
        "Model does not support feature extraction. Consider using a local model."
      );
    }

    throw new Error(`Embedding generation failed: ${error.message}`);
  }
}

// Check and initialize Pinecone index
async function initializePinecone() {
  try {
    const indexList = await pinecone.listIndexes();
    const indexExists = indexList.indexes?.some(
      (index) => index.name === "docs"
    );

    if (indexExists) {
      const indexDescription = await pinecone.describeIndex("docs");
      if (indexDescription.dimension !== 384) {
        logger.error("Existing Pinecone index 'docs' has incorrect dimension", {
          expected: 384,
          actual: indexDescription.dimension,
        });
        throw new Error("Pinecone index dimension mismatch");
      }
      logger.info("Pinecone index 'docs' already exists");
    } else {
      logger.info("Creating Pinecone index 'docs'...");
      await pinecone.createIndex({
        name: "docs",
        dimension: 384, // Matches BAAI/bge-small-en-v1.5
        metric: "cosine",
        spec: { serverless: { cloud: "aws", region: "us-east-1" } },
      });

      for (let i = 0; i < 10; i++) {
        const indexes = await pinecone.listIndexes();
        if (indexes.indexes?.some((index) => index.name === "docs")) {
          logger.info("Docs index created successfully");
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
      throw new Error("Failed to create Pinecone index after retries");
    }
  } catch (error) {
    logger.error("Pinecone initialization failed", { error: error.message });
    throw error;
  }
}
initializePinecone().catch((err) => {
  logger.error("Server startup failed due to Pinecone error", {
    error: err.message,
  });
  process.exit(1);
});

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

io.on("connection", (socket) => {
  logger.info("Socket connected", { socketId: socket.id });

  socket.on("chat", async (message) => {
    try {
      logger.info("Received chat message", { message });
      if (!message || typeof message !== "string" || message.trim() === "") {
        logger.warn("Invalid chat message received");
        socket.emit("response", "Error: Invalid or empty message");
        return;
      }

      const embeddingVector = await generateEmbedding(message);
      logger.info("Embedding generated for query", { message });
      if (!embeddingVector || embeddingVector.length !== 384) {
        logger.error("Invalid query embedding format", {
          length: embeddingVector?.length,
        });
        throw new Error(
          `Invalid query embedding format: expected 384 dimensions, got ${
            embeddingVector?.length || "unknown"
          }`
        );
      }

      const results = await pinecone.index("docs").query({
        vector: embeddingVector,
        topK: 5,
        includeMetadata: true,
      });
      logger.info("Pinecone query completed", {
        matchCount: results.matches.length,
      });

      const context = results.matches
        .map((m) => m.metadata?.text || "")
        .join(" ");
      logger.info("Context prepared", { contextLength: context.length });

      const response = await axios.post(
        "https://api.x.ai/v1/chat/completions",
        {
          model: "grok-3-mini",
          messages: [
            {
              role: "system",
              content:
                "You are Grok, created by xAI. Answer based on the provided context.",
            },
            {
              role: "user",
              content: `Context: ${context}\nQuestion: ${message}`,
            },
          ],
          max_tokens: 300,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.XAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 10000, // 10s timeout
        }
      );
      logger.info("Grok API response received", {
        response: response.data,
        tokenUsage: response.data.usage,
      });

      const answer =
        response.data.choices?.[0]?.message?.content ||
        response.data.choices?.[0]?.message?.reasoning_content ||
        "No response generated";
      socket.emit("response", answer);
      logger.info("Chat response sent", { message, answer });
    } catch (error) {
      const errorDetails = {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers,
      };
      logger.error("Chat error", { message, error: errorDetails });
      socket.emit("response", `Error processing query: ${error.message}`);
    }
  });

  socket.on("error", (error) => {
    logger.error("Socket error", { error: error.message, socketId: socket.id });
  });

  socket.on("disconnect", () => {
    logger.info("Socket disconnected", { socketId: socket.id });
  });
});

server.listen(4000, () => {
  logger.info("Server started on http://localhost:4000");
  logger.info("Test log to verify logger is working");
});
