import React from "react";
import { Socket } from "socket.io-client";
import { Message } from "../types";

interface MessageInputProps {
  message: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  socket: Socket;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

const MessageInput: React.FC<MessageInputProps> = ({
  message,
  setInput,
  socket,
  setMessages,
}) => {
  const sendMessage = () => {
    if (message.trim()) {
      const newMessage: Message = {
        sender: "user",
        message: message,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, newMessage]);
      socket.emit("chat", message);
      setInput("");
    }
  };

  return (
    <div className="flex">
      <input
        type="text"
        value={message}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask a question"
        className="border p-2 flex-grow"
        aria-label="Message input"
      />
      <button
        onClick={sendMessage}
        className="bg-blue-500 text-white p-2 ml-2 rounded"
        aria-label="Send message"
      >
        Send
      </button>
    </div>
  );
};

export default MessageInput;
