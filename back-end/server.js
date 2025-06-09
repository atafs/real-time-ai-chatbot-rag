const express = require("express");
const { Server } = require("socket.io");
const http = require("http");
const pdfParse = require("pdf-parse");
const { Pinecone } = require("@pinecone-database/pinecone");
const multer = require("multer");
const { pipeline } = require("@huggingface/transformers");
const axios = require("axios");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Initialize the embedding model with retry
let embedder;
async function loadEmbedder(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      embedder = await pipeline(
        "feature-extraction",
        "sentence-transformers/all-MiniLM-L6-v2",
        { dtype: "fp32" } // Explicitly set dtype to suppress warning
      );
      console.log("Embedding model loaded successfully");
      return;
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error.message);
      if (i === retries - 1) {
        console.error("Failed to load embedding model after retries");
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}
loadEmbedder();

// Check Pinecone configuration on startup
async function checkPinecone() {
  try {
    const indexList = await pinecone.listIndexes();
    console.log("Available Pinecone indexes:", indexList.indexes);

    const indexExists = indexList.indexes.some(
      (index) => index.name === "docs"
    );
    if (indexExists) {
      const indexDescription = await pinecone.describeIndex("docs");
      console.log("Docs index details:", indexDescription);
    } else {
      console.log("Docs index not found. Attempting to create...");
      await pinecone.createIndex({
        name: "docs",
        dimension: 384,
        metric: "cosine",
        spec: { serverless: { cloud: "aws", region: "us-east-1" } },
      });
      // Wait for index to be ready
      for (let i = 0; i < 10; i++) {
        const indexes = await pinecone.listIndexes();
        if (indexes.indexes.some((index) => index.name === "docs")) {
          console.log("Docs index created successfully");
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  } catch (error) {
    console.error("Pinecone initialization error:", error.message);
  }
}
checkPinecone();

app.use(express.json());
app.use(express.static("../public"));

app.post("/upload", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded" });
    }

    if (!embedder) {
      return res.status(500).json({ error: "Embedding model not initialized" });
    }

    const pdfText = await pdfParse(req.file.buffer);
    if (!pdfText.text || pdfText.text.trim() === "") {
      return res
        .status(400)
        .json({ error: "PDF contains no extractable text" });
    }

    console.log("PDF Text Length:", pdfText.text.length);

    // Sentence-aware chunking
    const sentences = pdfText.text.split(/(?<=[.!?])\s+/);
    const textChunks = [];
    let currentChunk = "";
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length <= 512) {
        currentChunk += sentence + " ";
      } else {
        textChunks.push(currentChunk.trim());
        currentChunk = sentence + " ";
      }
    }
    if (currentChunk) textChunks.push(currentChunk.trim());

    // Parallel embedding generation
    const embeddingPromises = textChunks.map(async (chunk) => {
      const output = await embedder(chunk, {
        pooling: "mean",
        normalize: true,
      });
      return Array.from(output.data);
    });
    const embeddingVectors = await Promise.all(embeddingPromises);

    for (const vector of embeddingVectors) {
      console.log("Local Embedding Length:", vector.length);
      if (!vector || vector.length !== 384) {
        throw new Error(
          `Invalid embedding format: expected 384-dimensional vector, got ${vector.length}`
        );
      }
    }

    // Average embeddings
    const avgEmbedding =
      embeddingVectors.length === 1
        ? embeddingVectors[0]
        : embeddingVectors[0].map(
            (_, i) =>
              embeddingVectors.reduce((sum, vec) => sum + vec[i], 0) /
              embeddingVectors.length
          );

    console.log("Checking Pinecone index...");
    const indexes = await pinecone.listIndexes();
    if (!indexes.indexes.some((index) => index.name === "docs")) {
      throw new Error(
        "Pinecone index 'docs' does not exist. Please create it in the Pinecone console."
      );
    }

    console.log("Attempting Pinecone upsert...");
    await pinecone.index("docs").upsert([
      {
        id: Date.now().toString(),
        values: avgEmbedding,
        metadata: { text: pdfText.text },
      },
    ]);
    console.log("Pinecone upsert successful");

    res.json({ message: "Document processed" });
  } catch (error) {
    console.error("Upload error:", error.message, error.stack);
    res
      .status(500)
      .json({ error: "Processing failed", details: error.message });
  }
});

io.on("connection", (socket) => {
  socket.on("chat", async (message) => {
    try {
      if (!embedder) {
        throw new Error("Embedding model not initialized");
      }

      const output = await embedder(message, {
        pooling: "mean",
        normalize: true,
      });
      const embeddingVector = Array.from(output.data);

      if (!embeddingVector || embeddingVector.length !== 384) {
        throw new Error(
          `Invalid query embedding format: expected 384-dimensional vector, got ${embeddingVector.length}`
        );
      }

      const results = await pinecone.index("docs").query({
        vector: embeddingVector,
        topK: 5,
        includeMetadata: true,
      });

      const context = results.matches.map((m) => m.metadata.text).join(" ");

      // Integrate xAI Grok API for response
      const response = await axios.post(
        "https://api.x.ai/v1/grok",
        {
          prompt: `Answer based on this context: ${context}\nQuestion: ${message}`,
          max_tokens: 150,
        },
        { headers: { Authorization: `Bearer ${process.env.XAI_API_KEY}` } }
      );

      socket.emit("response", response.data.choices[0].text);
    } catch (error) {
      console.error("Chat error:", error.message);
      socket.emit("response", `Error processing query: ${error.message}`);
    }
  });
});

server.listen(3000, () => console.log("Server on http://localhost:3000"));
