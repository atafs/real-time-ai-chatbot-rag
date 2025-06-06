const express = require('express');
const app = express();
const port = 3000;

// Middleware to parse JSON
app.use(express.json());

// Root endpoint for testing
app.get('/', (req, res) => {
  res.send('Real-Time AI Chatbot Backend');
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});