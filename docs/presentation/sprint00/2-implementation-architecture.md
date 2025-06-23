# RAG Chatbot Architecture Document

## Overview

This document outlines the architecture of a full-stack **Retrieval-Augmented Generation (RAG) Chatbot** application. The app allows users to upload PDF documents, extract text, generate embeddings, store them in a vector database, and interact with a real-time chatbot that provides answers based on the uploaded content. It integrates modern web technologies, AI models, and a vector database for a seamless, context-aware experience.

---

## System Architecture

The application employs a **client-server architecture** with a React frontend and a Node.js/Express backend, augmented by external services for embeddings and language processing. Real-time communication is facilitated by Socket.IO, and Pinecone serves as the vector database.

### High-Level Components

1. **Frontend (Client)**
   - **Framework**: React
   - **Purpose**: User interface for PDF uploads, chat messaging, and response display.
   - **Key Features**:
     - PDF file upload functionality.
     - Real-time chat via Socket.IO.
     - Responsive design with CSS styling.
2. **Backend (Server)**
   - **Framework**: Node.js, Express, Socket.IO
   - **Purpose**: Manages file processing, embedding generation, vector storage, and chat logic.
   - **Key Features**:
     - Text extraction from PDFs.
     - Embedding generation with Hugging Face API.
     - Vector storage/querying with Pinecone.
     - Real-time chat handling.
     - Logging with Winston.
3. **External Services**
   - **Hugging Face API**: Generates embeddings (`BAAI/bge-small-en-v1.5` model).
   - **Pinecone**: Stores and queries document embeddings.
   - **xAI Grok API**: Generates context-aware responses.
4. **Communication Layer**
   - **Socket.IO**: Real-time bidirectional communication.
   - **HTTP/REST**: File uploads and other operations.

### Architecture Diagram

```
+-------------------+         +-------------------+         +-------------------+
|     Frontend      |         |      Backend      |         | External Services |
| (React, Socket.IO)|<------->| (Node.js, Express)|<------->| - Hugging Face    |
| - File Upload     |         | - PDF Processing  |         | - Pinecone        |
| - Chat Interface  |         | - Socket.IO Server|         | - xAI Grok API    |
| - Real-time UI    |         | - Pinecone Client |         |                   |
+-------------------+         +-------------------+         +-------------------+
```

---

## Data Flow

1. **PDF Upload and Processing**:

   - User uploads a PDF via the frontend.
   - Frontend sends the file to the backend (`POST /upload`).
   - Backend:
     - Handles upload with `multer` (10MB limit, PDF only).
     - Extracts text with `pdf-parse`.
     - Splits text into 512-character chunks (50-character overlap).
     - Generates embeddings via Hugging Face API.
     - Upserts averaged embeddings to Pinecone with a document ID.

2. **Chat Interaction**:

   - User sends a question via the chat UI.
   - Frontend emits the message via Socket.IO (`chat` event).
   - Backend:
     - Generates query embedding with Hugging Face API.
     - Queries Pinecone for top 5 relevant chunks (cosine similarity).
     - Builds context from retrieved chunks.
     - Sends context and question to xAI Grok API.
     - Emits response via Socket.IO (`response` event).
   - Frontend displays the response.

3. **Logging**:
   - Winston logs events (e.g., uploads, Pinecone queries) to console and `server.log`.

---

## Technology Stack

| **Component**          | **Technology**                        |
| ---------------------- | ------------------------------------- |
| Frontend Framework     | React, Socket.IO-client               |
| Backend Framework      | Node.js, Express, Socket.IO           |
| File Upload Handling   | Multer                                |
| PDF Processing         | pdf-parse                             |
| Vector Database        | Pinecone (serverless, AWS)            |
| Embedding Generation   | Hugging Face (BAAI/bge-small-en-v1.5) |
| Language Model         | xAI Grok API (grok-3-mini)            |
| Logging                | Winston                               |
| Styling                | CSS                                   |
| Environment Management | dotenv                                |
| CORS Handling          | cors                                  |

---

## Key Features

- **Real-Time Chat**: Instant messaging via Socket.IO.
- **RAG Pipeline**:
  - PDF text extraction and chunking.
  - Embedding storage in Pinecone.
  - Context-aware responses via Grok API.
- **Scalability**: Serverless Pinecone and cloud-ready Express backend.
- **Error Handling**: File validation, detailed logging, API failure recovery.
- **Security**: CORS restrictions, environment variable usage for API keys.

---

## File Structure

The project is divided into two main directories: `frontend` and `backend`.

### Frontend

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── App.css
│   ├── App.tsx
│   ├── index.css
│   ├── index.tsx
│   └── reportWebVitals.ts
└── package.json
```

### Backend

```
backend/
├── index.js
├── logs.js
├── api/
│   ├── pinecone.js
│   └── huggingface.js
├── endpoints/
│   └── upload.js
└── sockets/
    └── index.js
```

Additional configuration files (e.g., `.env`) exist but are omitted here for brevity.

---

## Deployment Considerations

- **Frontend**:
  - Deploy on static hosting (e.g., Vercel, Netlify).
  - Configure Socket.IO client to connect to the backend URL.
- **Backend**:
  - Host on a cloud platform (e.g., AWS EC2, Heroku).
  - Secure API keys in environment variables.
  - Use a load balancer for scalability.
- **Pinecone**:
  - Leverage serverless setup for cost efficiency.
  - Monitor index performance.
- **Security**:
  - Enforce HTTPS.
  - Rotate API keys regularly.
  - Rate-limit the `/upload` endpoint.

---

## Future Enhancements

- **Multi-File Support**: Add support for TXT, DOCX, etc.
- **Advanced RAG**: Implement hybrid search or query expansion.
- **UI Enhancements**: Add loading indicators, markdown support.
- **Performance**: Cache embeddings, batch Pinecone queries.
- **Analytics**: Track usage and API costs.

---

## Conclusion

The RAG Chatbot is a sophisticated full-stack application blending real-time web technologies with AI-driven document processing. Its modular design and integration with Pinecone, Hugging Face, and xAI Grok make it an excellent showcase of modern development skills.
