import React, { useState, useEffect } from "react";
import io, { Socket } from "socket.io-client";
import axios from "axios";

const socket: Socket = io("http://localhost:4000");

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
      await axios.post("http://localhost:4000/upload", formData);
      alert("File uploaded");
    }
  };

  const sendMessage = (): void => {
    if (input.trim()) {
      console.log("Sending chat message:", input); // Debug log
      setMessages((prev) => [...prev, { sender: "user", text: input }]);
      socket.emit("chat", input);
      setInput("");
    }
  };

  return (
    <div className="min-h-screen bg-blue-500 text-white p-4 flex flex-col">
      <h1 className="text-3xl font-bold text-center">RAG Chatbot</h1>
      <input
        type="file"
        accept=".pdf"
        className="my-2 p-2 bg-white text-black rounded"
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setFile(e.target.files ? e.target.files[0] : null)
        }
      />
      <button
        className="bg-blue-800 hover:bg-blue-900 text-white p-2 rounded mb-4"
        onClick={uploadFile}
      >
        Upload PDF
      </button>
      <div className="chat flex-grow bg-white text-black p-4 rounded shadow">
        {messages.map((msg, i) => (
          <p
            key={i}
            className={`mb-2 ${
              msg.sender === "user"
                ? "text-right text-blue-700"
                : "text-left text-blue-800"
            }`}
          >
            {msg.text}
          </p>
        ))}
      </div>
      <div className="mt-4 flex">
        <input
          type="text"
          value={input}
          className="flex-grow p-2 rounded-l bg-white text-black"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setInput(e.target.value)
          }
          placeholder="Ask a question"
        />
        <button
          className="bg-blue-800 hover:bg-blue-900 text-white p-2 rounded-r"
          onClick={sendMessage}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default App;
