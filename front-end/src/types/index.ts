export interface Message {
  sender: "user" | "bot";
  text: string;
  timestamp?: string; // Optional, as previously suggested
}
