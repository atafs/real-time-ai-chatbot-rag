import React, { useState, useEffect, Suspense } from "react";
import { io, Socket } from "socket.io-client";
import { ToastContainer } from "react-toastify"; // Keep ToastContainer for rendering toasts
import "react-toastify/dist/ReactToastify.css";
import ChatWindow from "./components/ChatWindow";
import FileUploader from "./components/FileUploader";
import MessageInput from "./components/MessageInput";
import useSocket from "./hooks/useSocket";

const socket: Socket = io("http://localhost:4000", { autoConnect: false });

interface Message {
  sender: "user" | "bot";
  message: string;
  timestamp: string;
}

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem("messages");
    return saved ? JSON.parse(saved) : [];
  });
  const [message, setInput] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const { connect, disconnect } = useSocket(socket, setMessages);

  useEffect(() => {
    localStorage.setItem("messages", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="max-w-lg sm:max-w-2xl mx-auto p-4">
        <h1 className="text-2xl font-bold text-center mb-4">RAG Chatbot</h1>
        <FileUploader file={file} setFile={setFile} setMessages={setMessages} />
        <ChatWindow messages={messages} />
        <MessageInput
          message={message}
          setInput={setInput}
          socket={socket}
          setMessages={setMessages}
        />
        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    </Suspense>
  );
};

export default App;
