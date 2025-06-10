const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const logger = require("../logger");
const { getPineconeClient } = require("../api/pinecone");
const { processTextChunks } = require("../api/huggingface");

const router = express.Router();
const pinecone = getPineconeClient();

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

router.post("/upload", upload.single("pdf"), async (req, res) => {
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

    // Generate and average embeddings for chunks
    const avgEmbedding = await processTextChunks(textChunks);

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

module.exports = router;
