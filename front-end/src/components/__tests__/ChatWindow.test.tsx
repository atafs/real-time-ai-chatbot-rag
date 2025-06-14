// Test file
import { render, screen } from "@testing-library/react";
import ChatWindow from "../ChatWindow";
import { Message } from "../../types";

test("renders messages correctly", () => {
  const messages: Message[] = [
    { sender: "user", text: "Hello", timestamp: "10:00" },
    { sender: "bot", text: "Hi!", timestamp: "10:01" },
  ];
  render(<ChatWindow messages={messages} />);
  expect(screen.getByText("Hello")).toBeInTheDocument();
  expect(screen.getByText("Hi!")).toBeInTheDocument();
});
