# Real-Time AI Chatbot with RAG: Architecture Overview

This document outlines the architecture for a **Real-Time AI Chatbot with Retrieval-Augmented Generation (RAG)**, designed to allow users to upload documents (e.g., PDFs) and ask questions answered using document context. The architecture is optimized for a 1–2 week development timeline, focusing on simplicity, functionality, and core RAG capabilities.

---

## Architecture Components

### 1. Frontend (React)

- **Purpose**: User interface for file uploads, real-time chat, and response display.
- **Components**:
  - **File Upload**: Input field for PDF uploads, using `FormData` for backend communication.
  - **Chat Interface**: Conversational UI for user messages and bot responses, styled with CSS.
  - **Real-Time Messaging**: Socket.IO client for sending queries and receiving responses.
- **Tech**: React, Socket.IO-client, Axios, CSS.
- **Features**:
  - File upload button (drag-and-drop optional).
  - Scrollable chat window with message history.
  - Input field and "Send" button for questions.
- **Time Estimate**: 3–4 days.

### 2. Backend (Node.js + Express + Socket.IO)

- **Purpose**: Manages file processing, document embedding, real-time communication, and LLM integration.
- **Components**:
  - **File Processing**: Extracts text from PDFs using `pdf-parse`.
  - **Embedding Generation**: Converts text to vector embeddings via Hugging Face’s `sentence-transformers` API.
  - **Vector Storage**: Stores embeddings in Pinecone for retrieval.
  - **Query Processing**:
    - Converts user queries to embeddings.
    - Retrieves relevant document chunks from Pinecone via similarity search.
    - Combines chunks with query and sends to LLM (e.g., xAI Grok API) for response generation.
  - **Real-Time Communication**: Socket.IO for live chat.
- **Tech**: Node.js, Express, Socket.IO, `pdf-parse`, Pinecone, Axios.
- **Features**:
  - REST endpoint (`/upload`) for PDF uploads.
  - Socket.IO events (`chat`, `response`) for query-response flow.
  - Pinecone integration for vector storage/retrieval.
  - LLM API for contextual answers.
- **Time Estimate**: 5–7 days.

### 3. Database (Pinecone)

- **Purpose**: Stores document embeddings for scalable retrieval.
- **Setup**:
  - Create Pinecone index (`docs`) for vectors.
  - Upsert embeddings with metadata (e.g., text, IDs).
  - Query index with user question embeddings for top-k chunks.
- **Tech**: Pinecone (vector database).
- **Features**:
  - Stores document embeddings.
  - Supports similarity search for RAG context.
- **Time Estimate**: 1–2 days.

### 4. External APIs

- **Hugging Face API**: Generates embeddings for documents and queries.
- **xAI Grok API** (or alternative LLM): Generates responses based on document chunks and queries.
- **Tech**: Axios for API requests.
- **Time Estimate**: 1 day.

### 5. Deployment (Optional)

- **Purpose**: Host application for public access.
- **Setup**:
  - Backend: Render or Heroku.
  - Frontend: Vercel or Netlify.
  - Configure environment variables for API keys.
- **Time Estimate**: 1–2 days (if included).

---

## Data Flow

1. **Document Upload**:
   - Frontend sends PDF to backend (`/upload`).
   - Backend extracts text (`pdf-parse`), generates embeddings (Hugging Face API), and stores in Pinecone.
2. **User Query**:
   - Frontend sends query via Socket.IO (`chat`).
   - Backend converts query to embedding, queries Pinecone, and sends context + query to LLM.
   - LLM response sent to frontend via Socket.IO (`response`).
3. **Real-Time Display**:
   - Frontend updates chat UI with query and response.

---

## Architecture Diagram

![Architecture Diagram](https://kroki.io/plantuml/svg/eNp9U8FS4kAQvecr-kaoMlLlkcOWIKJUuWtWwl4wh2HSkpHJTKpnIvD39gSFbImeknT3e9Pvvcm184J8U2l4QqGTTFUIoxnclMKvrIcRyVJ5lL4hjKIeTPBFGQRpq9oaNN5Fy4VDgnhMdssvg1Fd9_NoOSVrPJri2cTMK_0FzK3coL-cPSZSK0b2n00CU6URFrW2ooDFLFROW4QVmGksGNcS_bEFXr66C7jd1YTOdThbsnQyhQx3nvue-MxQu61WWBTKrOEOTSj8bZD2kJKVzMD1w5mO1TgMM3wiw5GM0DBHelM8l3eUu2aVnNTDVvlSGfgCOccCSfILlimzSEazoH_sqyWYjPv59_P3zXod9p8KGTBHQe4n0I4jvCO7gVHKrsYPD7_7-X_xGV7CKxZ9Nr8DyWeGOQzhPstSiDtxDSF9nGcwaNov9v-YBcQhuSH0JD96gG8h7KjD1pJ_xPrJPTjCo1OrHTwjcXjym_XBjdDaBXVzv9fBqhc2VWpByu8jt1GmFiQqqKyxsiTLV8tTg53OMc9AgMA_w1Wn60pR2G3LK7Tr4mpxuFpXUXTNCzPuHVfoIhA=)

---

## Sequence Diagram

Below is a sequence diagram depicting the interactions for document upload and query processing, using Mermaid syntax.

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend (React)
    participant B as Backend (Node.js)
    participant P as Pinecone
    participant H as Hugging Face API
    participant G as xAI Grok API

    %% Document Upload
    U->>F: Upload PDF
    F->>B: POST /upload (PDF)
    B->>B: Extract text (pdf-parse)
    B->>H: Generate embeddings
    H-->>B: Return embeddings
    B->>P: Upsert embeddings
    P-->>B: Confirm upsert
    B-->>F: Upload success
    F-->>U: Show success message

    %% Query Processing
    U->>F: Send question
    F->>B: Socket.IO 'chat' (question)
    B->>H: Generate query embedding
    H-->>B: Return embedding
    B->>P: Query top-k chunks
    P-->>B: Return relevant chunks
    B->>G: Send context + question
    G-->>B: Return response
    B->>F: Socket.IO 'response'
    F-->>U: Display response
```

---

## Development Plan (1–2 Weeks)

- **Week 1**:
  - **Day 1–2**: Backend setup (Node.js, Express, Socket.IO), integrate `pdf-parse`.
  - **Day 3–4**: Configure Pinecone and Hugging Face API for embeddings.
  - **Day 5**: Build frontend (React) with file upload and chat UI.
- **Week 2**:
  - **Day 6–7**: Integrate Socket.IO for real-time chat and LLM API.
  - **Day 8–9**: Test end-to-end flow, polish UI with CSS.
  - **Day 10**: (Optional) Deploy to cloud, finalize documentation.
  - **Buffer**: 1–2 days for debugging/testing.

---

## Simplifications for Timeline

- Support only PDFs (exclude TXT, DOCX).
- Use Hugging Face’s hosted API instead of local `sentence-transformers`.
- Implement basic RAG (skip query expansion).
- Focus on functional UI (skip animations, drag-and-drop).
- Use xAI Grok API for LLM (see https://x.ai/api for access).
- Defer deployment to post-MVP if time-constrained.

---

## CV Highlights

- **Technologies**: Node.js, Express, React, Socket.IO, Pinecone, Hugging Face API, xAI Grok API.
- **Skills**: RAG, vector databases, real-time systems, document processing, API integration.
- **Impact**: Built a 2025-trending AI chatbot with RAG, showcasing advanced AI expertise.
