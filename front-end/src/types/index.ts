export interface Message {
  sender: "user" | "bot";
  message: string;
  timestamp: string;
}
