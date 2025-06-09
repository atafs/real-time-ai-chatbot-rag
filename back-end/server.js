const express = require("express");
const { Server } = require("socket.io");
const http = require("http");
const pdfParse = require("pdf-parse");
const { Pinecone } = require("@pinecone-database/pinecone");
const multer = require("multer");
const { pipeline } = require("@huggingface/transformers");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Initialize the embedding model
let embedder;
(async () => {
  try {
    embedder = await pipeline(
      "feature-extraction",
      "sentence-transformers/all-MiniLM-L6-v2"
    );
    console.log("Embedding model loaded successfully");
  } catch (error) {
    console.error("Failed to load embedding model:", error.message);
  }
})();

// Check Pinecone configuration on startup
async function checkPinecone() {
  try {
    // List all indexes
    const indexList = await pinecone.listIndexes();
    console.log("Available Pinecone indexes:", indexList.indexes);

    // Check if docs index exists
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
        spec: { serverless: { cloud: "aws", region: "us-east-1" } }, // Adjust region
      });
      console.log("Docs index created successfully");
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

    const chunkSize = 512;
    const textChunks = pdfText.text.match(
      new RegExp(`.{1,${chunkSize}}`, "g")
    ) || [pdfText.text];
    const embeddingVectors = [];

    for (const chunk of textChunks) {
      try {
        const output = await embedder(chunk, {
          pooling: "mean",
          normalize: true,
        });
        const embeddingVector = Array.from(output.data);

        console.log("Local Embedding Length:", embeddingVector.length);

        if (!embeddingVector || embeddingVector.length !== 384) {
          throw new Error(
            `Invalid embedding format: expected 384-dimensional vector, got ${embeddingVector.length}`
          );
        }

        embeddingVectors.push(embeddingVector);
      } catch (error) {
        console.error("Embedding Error:", error.message);
        throw error;
      }
    }

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

      socket.emit("response", `Context retrieved: ${context}`);
    } catch (error) {
      console.error("Chat error:", error.message);
      socket.emit("response", `Error processing query: ${error.message}`);
    }
  });
});

server.listen(3000, () => console.log("Server on http://localhost:3000"));
