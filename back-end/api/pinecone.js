const { Pinecone } = require("@pinecone-database/pinecone");
const logger = require("../logs");

// Initialize Pinecone client
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

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

module.exports = { getPineconeClient: () => pinecone, initializePinecone };
