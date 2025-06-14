import { render } from "@testing-library/react";
import ChatWindow from "../ChatWindow";

test("ChatWindow snapshot", () => {
  const messages = [
    { sender: "user", text: "Hello!", timestamp: "10:00" },
    { sender: "bot", text: "Hi!", timestamp: "10:01" },
  ];
  const { asFragment } = render(<ChatWindow messages={messages} />);
  expect(asFragment()).toMatchSnapshot();
});
