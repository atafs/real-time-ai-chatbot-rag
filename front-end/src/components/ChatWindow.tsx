// src/components/ChatWindow.tsx
import React from "react";
import { Message } from "../types";

interface ChatWindowProps {
  messages: Message[];
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages }) => {
  return (
    <div
      className="chat border border-gray-300 p-4 h-96 overflow-y-scroll mb-4"
      role="log"
      aria-live="polite"
    >
      {messages.map((msg, i) => (
        <p
          key={i}
          className={`mb-2 ${
            msg.sender === "user"
              ? "text-right text-blue-600"
              : "text-left text-green-600"
          }`}
        >
          <span className="font-bold">{msg.sender}: </span>
          {msg.text}{" "}
          <span className="text-xs text-gray-500">({msg.timestamp})</span>
        </p>
      ))}
    </div>
  );
};

export default ChatWindow;
