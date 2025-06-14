import { useCallback } from "react";
import { Socket } from "socket.io-client";
import { Message } from "../types";

const useSocket = (
  socket: Socket,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
) => {
  const connect = useCallback(() => {
    socket.connect();
    socket.on("response", (response: string) => {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          message: response, // Changed 'text' to 'message'
          timestamp: new Date().toISOString(),
        },
      ]);
    });
  }, [socket, setMessages]);

  const disconnect = useCallback(() => {
    socket.off("response");
    socket.disconnect();
  }, [socket]);

  return { connect, disconnect };
};

export default useSocket;
