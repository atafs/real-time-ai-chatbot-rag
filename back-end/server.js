const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fileUpload = require('express-fileupload');
const pdfParse = require('pdf-parse');
const app = express();
const port = 3000;

// Create HTTP server and attach Socket.IO
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(express.json());
app.use(fileUpload());
app.use(express.static('public')); // Serve static files from public/

// Root endpoint for testing
app.get('/', (req, res) => {
  res.send('Real-Time AI Chatbot Backend');
});

// File upload endpoint with PDF text extraction
app.post('/upload', async (req, res) => {
  try {
    if (!req.files || !req.files.pdf) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }
    const pdfFile = req.files.pdf;
    // Extract text from PDF
    const pdfData = await pdfParse(pdfFile.data);
    res.json({
      message: 'PDF processed',
      filename: pdfFile.name,
      text: pdfData.text.substring(0, 200) + '...' // Limit response size for testing
    });
  } catch (error) {
    console.error('PDF parsing error:', error);
    res.status(500).json({ error: 'Failed to process PDF' });
  }
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  socket.on('chat', (message) => {
    console.log('Received message:', message);
    socket.emit('response', `Echo: ${message}`);
  });
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Start server
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});