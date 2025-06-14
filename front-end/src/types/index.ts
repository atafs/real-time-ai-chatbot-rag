// src/types.ts
export interface Message {
  sender: "user" | "bot";
  text: string;
  timestamp: string;
}
