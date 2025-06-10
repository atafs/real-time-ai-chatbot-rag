# RAG Chatbot

A real-time AI chatbot using Retrieval-Augmented Generation (RAG) to answer questions based on uploaded PDF documents. Built with Node.js, Express, Socket.IO, React, Pinecone, and Hugging Face APIs.

## Setup Instructions

1. **Clone the Repository**

   ```bash
   git clone https://github.com/atafs/real-time-ai-chatbot-rag.git
   cd real-time-ai-chatbot-rag
   ```

2. **Install Dependencies on the root folder of both back-end and front-end**

   ```bash
   npm install
   ```

3. **Set Up Environment Variables**
   Create a `.env` file in the project root and add the following keys (replace placeholders with actual values):

   ```
   PINECONE_API_KEY=your-pinecone-api-key
   HUGGINGFACE_API_KEY=your-huggingface-api-key
   XAI_API_KEY=your-xai-api-key
   FRONTEND_URL=http://localhost:3000
   ```

4. **Start the Application on the root folder of both back-end and front-end**

   ```bash
   npm start
   ```

   - The backend server will run on `http://localhost:4000`.
   - The frontend will be available at `http://localhost:3000` (or as configured).

## Usage

- Upload a PDF file via the web interface.
- Ask questions related to the document content, and the chatbot will respond using RAG-based answers.

## Notes

- Ensure Pinecone, Hugging Face, and xAI API keys are valid.
- The application requires Node.js and npm installed.

## Video Conversion

To convert the demo video from `.mov` to `.mp4` for web compatibility (e.g., for the GitHub Pages demo), use the following FFmpeg command:

```bash
ffmpeg -i demo_1-0-0_2025-06-10.mov -vcodec h264 -acodec aac demo_1-0-0_2025-06-10.mp4
```

- Ensure FFmpeg is installed (e.g., via `brew install ffmpeg` on macOS or `sudo apt install ffmpeg` on Ubuntu).
- This command converts the `.mov` file to `.mp4` using H.264 video and AAC audio codecs, which are widely supported by web browsers.

## Poster Image Generation

To generate a poster image (thumbnail) for the demo video, use the following FFmpeg command:

```bash
ffmpeg -i demos/demo_1-0-0_2025-06-10.mp4 -vframes 1 -q:v 2 demos/demo_1-0-0_2025-06-10_poster.jpg
```

- This command extracts a single frame from the video and saves it as a JPEG image in the `demos/` folder.
- Ensure the video file is in the `demos/` folder before running the command.
