import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { ClipLoader } from "react-spinners";
import * as mammoth from "mammoth";
import { Message } from "../types";

interface FileUploaderProps {
  file: File | null;
  setFile: React.Dispatch<React.SetStateAction<File | null>>;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  file,
  setFile,
  setMessages,
}) => {
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validTypes = [
      "application/pdf",
      "text/plain",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!validTypes.includes(selectedFile.type)) {
      toast.error("Only PDF, TXT, or DOCX files are allowed");
      return;
    }
    setFile(selectedFile);
  };

  const uploadFile = async () => {
    if (!file) {
      toast.warn("Please select a file");
      return;
    }

    setLoading(true);
    try {
      let formData = new FormData();
      if (file.type === "text/plain") {
        const reader = new FileReader();
        reader.onload = async (e) => {
          formData.append(
            "txt",
            new Blob([e.target?.result as string], { type: "text/plain" })
          );
          await axios.post("http://localhost:4000/upload", formData);
          toast.success("File uploaded");
          setMessages([]);
          localStorage.removeItem("messages"); // Updated key to 'messages'
        };
        reader.readAsText(file);
      } else if (
        file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        formData.append(
          "docx",
          new Blob([result.value], { type: "text/plain" })
        );
        await axios.post("http://localhost:4000/upload", formData);
        toast.success("File uploaded");
        setMessages([]);
        localStorage.removeItem("messages");
      } else {
        formData.append("pdf", file);
        await axios.post("http://localhost:4000/upload", formData);
        toast.success("File uploaded");
        setMessages([]);
        localStorage.removeItem("messages");
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Upload failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-4">
      <input
        type="file"
        accept=".pdf,.txt,.docx"
        onChange={handleFileChange}
        className="border p-2"
        aria-label="Upload document"
      />
      <button
        onClick={uploadFile}
        className="bg-blue-500 text-white p-2 ml-2 rounded"
        disabled={loading}
        aria-label="Upload file"
      >
        {loading ? <ClipLoader size={20} color="#fff" /> : "Upload"}
      </button>
    </div>
  );
};

export default FileUploader;
