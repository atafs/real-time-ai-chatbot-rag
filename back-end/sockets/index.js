const logger = require("../logs");
const axios = require("axios");
const { generateEmbedding } = require("../api/huggingface");

// Handle Socket.IO connections
function setupSocket(io, pinecone) {
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
      logger.error("Socket error", {
        error: error.message,
        socketId: socket.id,
      });
    });

    socket.on("disconnect", () => {
      logger.info("Socket disconnected", { socketId: socket.id });
    });
  });
}

module.exports = { setupSocket };
