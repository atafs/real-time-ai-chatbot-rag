const axios = require("axios");
const logger = require("../logger");

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

// Process text chunks and generate averaged embeddings
async function processTextChunks(textChunks) {
  try {
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

    return avgEmbedding;
  } catch (error) {
    logger.error("Text chunk processing failed", { error: error.message });
    throw error;
  }
}

module.exports = { generateEmbedding, processTextChunks };
