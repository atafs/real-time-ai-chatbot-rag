import React, { useState, useEffect } from "react";
import io, { Socket } from "socket.io-client";
import axios from "axios";
import "./App.css";

const socket: Socket = io("http://localhost:3000");

interface Message {
  sender: "user" | "bot";
  text: string;
}

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    socket.on("response", (response: string) => {
      setMessages((prev) => [...prev, { sender: "bot", text: response }]);
    });

    return () => {
      socket.off("response");
    };
  }, []);

  const uploadFile = async (): Promise<void> => {
    if (file) {
      const formData = new FormData();
      formData.append("pdf", file);
      await axios.post("http://localhost:3000/upload", formData);
      alert("File uploaded");
    }
  };

  const sendMessage = (): void => {
    if (input.trim()) {
      setMessages((prev) => [...prev, { sender: "user", text: input }]);
      socket.emit("chat", input);
      setInput("");
    }
  };

  return (
    <div className="App">
      <h1>RAG Chatbot</h1>
      <input
        type="file"
        accept=".pdf"
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setFile(e.target.files ? e.target.files[0] : null)
        }
      />
      <button onClick={uploadFile}>Upload PDF</button>
      <div className="chat">
        {messages.map((msg, i) => (
          <p key={i} className={msg.sender}>
            {msg.text}
          </p>
        ))}
      </div>
      <input
        type="text"
        value={input}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setInput(e.target.value)
        }
        placeholder="Ask a question"
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
};

export default App;
