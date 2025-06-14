import { render, fireEvent, screen } from "@testing-library/react";
import FileUploader from "../FileUploader";
import { toast } from "react-toastify";

// Mock axios
jest.mock("axios", () => ({
  post: jest
    .fn()
    .mockResolvedValue({ data: { message: "Document processed" } }),
}));

describe("FileUploader", () => {
  test("validates file type", async () => {
    const setFile = jest.fn();
    const setMessages = jest.fn();

    // Mock toast.error
    const toastErrorSpy = jest.spyOn(toast, "error");

    render(
      <FileUploader file={null} setFile={setFile} setMessages={setMessages} />
    );

    const input = screen.getByLabelText("Upload document");
    const file = new File([""], "test.jpg", { type: "image/jpeg" });

    fireEvent.change(input, { target: { files: [file] } });

    expect(toastErrorSpy).toHaveBeenCalledWith(
      "Only PDF, TXT, or DOCX files are allowed"
    );
    expect(setFile).not.toHaveBeenCalled();

    toastErrorSpy.mockRestore();
  });
});
