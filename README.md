# Real-Time AI Chatbot with RAG

## Backend Setup (Day 1–2)

### Overview

- Initialized a Node.js project with Express for API endpoints.
- Integrated Socket.IO for real-time chat functionality.
- Added `pdf-parse` for extracting text from uploaded PDFs.
- Set up file upload handling with `express-fileupload`.

### Running the Server

1. Install dependencies:

   ```bash
   npm install
   ```

2. curl test request

```
curl -v -X POST http://localhost:3000/upload \
  -F "pdf=@/Users/americotomas/Repos/staffengineer/real-time-ai-chatbot-rag/back-end/test.pdf" \
  -H "Content-Type: multipart/form-data"
```
