const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const logger = require("../logs");
const { getPineconeClient } = require("../api/pinecone");
const { processTextChunks } = require("../api/huggingface");

const router = express.Router();
const pinecone = getPineconeClient();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const validTypes = [
      "application/pdf",
      "text/plain",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (validTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, TXT, or DOCX files are allowed"), false);
    }
  },
});

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      logger.warn("No file uploaded");
      return res.status(400).json({ error: "No file uploaded" });
    }

    let text;
    if (req.file.mimetype === "application/pdf") {
      const pdf = await pdfParse(req.file.buffer);
      text = pdf.text;
    } else if (req.file.mimetype === "text/plain") {
      text = req.file.buffer.toString("utf-8");
    } else {
      text = req.file.buffer.toString("utf-8"); // Assume pre-extracted by frontend
    }

    if (!text || text.trim() === "") {
      logger.warn("File contains no extractable text");
      return res
        .status(400)
        .json({ error: "File contains no extractable text" });
    }

    const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim());
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
        currentChunk =
          sentences[Math.max(0, i - 1)].slice(-overlapSize) + sentence + " ";
      }
    }
    if (currentChunk) textChunks.push(currentChunk.trim());

    const avgEmbedding = await processTextChunks(textChunks);
    const docId = Date.now().toString();
    await pinecone.index("docs").upsert([
      {
        id: docId,
        values: avgEmbedding,
        metadata: { text: text.slice(0, 1000) },
      },
    ]);

    logger.info("Document processed", { id: docId });
    res.json({ message: "Document processed" });
  } catch (error) {
    logger.error("Upload error", { error: error.message });
    res
      .status(500)
      .json({ error: "Processing failed", details: error.message });
  }
});

module.exports = router;
