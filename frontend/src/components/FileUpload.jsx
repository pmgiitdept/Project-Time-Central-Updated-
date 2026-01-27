// components/FileUpload.jsx
import { useState } from "react";
import api from "../api";
import { toast } from "react-toastify";
import "./styles/ClientDashboard.css";
import { motion } from "framer-motion";

/* ======== Cutoff Logic ======== */
function getDTRCutoffStatus() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const year = today.getFullYear();
  const month = today.getMonth();

  const cutoff15Start = new Date(year, month, 15);
  const cutoff15End = new Date(year, month, 20);

  const cutoff30Start = new Date(year, month, 30);
  const cutoff30End = new Date(cutoff30Start);
  cutoff30End.setDate(cutoff30End.getDate() + 5);

  const prev30Start = new Date(year, month - 1, 30);
  const prev30End = new Date(prev30Start);
  prev30End.setDate(prev30End.getDate() + 5);

  const canSubmit =
    (today >= cutoff15Start && today <= cutoff15End) ||
    (today >= cutoff30Start && today <= cutoff30End) ||
    (today >= prev30Start && today <= prev30End);

  let message = "Unavailable – wait for next cutoff";

  if (today >= cutoff15Start && today <= cutoff15End) {
    message = `Submission available until ${cutoff15End.toLocaleDateString()}`;
  } else if (today >= cutoff30Start && today <= cutoff30End) {
    message = `Submission available until ${cutoff30End.toLocaleDateString()}`;
  } else if (today >= prev30Start && today <= prev30End) {
    message = `Submission available until ${prev30End.toLocaleDateString()}`;
  }

  return { canSubmit, message };
}

export default function FileUpload({ refreshFiles, refreshPDFs }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [uploadType, setUploadType] = useState(null); // "pdf" | "excel"

  const { canSubmit, message } = getDTRCutoffStatus();

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!canSubmit) return toast.error("Submission is unavailable outside cutoff.");
    if (!file) return toast.error("Select a file first.");
    if (!uploadType) return toast.error("Select upload type.");

    const isExcel = /\.(xlsx|xls|csv)$/i.test(file.name);
    const isPDF = file.type === "application/pdf";

    if (uploadType === "excel" && !isExcel) {
      return toast.error("Please upload an Excel file (.xlsx, .xls, .csv).");
    }

    if (uploadType === "pdf" && !isPDF) {
      return toast.error("Please upload a PDF file.");
    }

    setUploading(true);
    const token = localStorage.getItem("access_token");
    const formData = new FormData();
    formData.append("file", file);

    try {
      if (uploadType === "excel") {
        await api.post("/files/files/", formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Excel DTR uploaded successfully!");
        refreshFiles();
      }

      if (uploadType === "pdf") {
        await api.post("/files/pdfs/", formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("PDF uploaded successfully!");
        refreshPDFs();
      }

      setHasSubmitted(true);
      setFile(null);
      setUploadType(null);
    } catch (err) {
      console.error(err);
      toast.error("File upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div
      className="upload-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      <h2 className="upload-title">Upload DTR</h2>

      <p
        style={{
          fontSize: "0.9rem",
          color: canSubmit ? "green" : "red",
          marginBottom: "1rem",
        }}
      >
        {message}
      </p>

      <form onSubmit={handleUpload} className="upload-form">
        <input
          type="file"
          accept=".xlsx,.xls,.csv,application/pdf"
          onChange={(e) => setFile(e.target.files[0])}
          className="file-input"
        />

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="submit"
            className="upload-button"
            disabled={uploading || !canSubmit || hasSubmitted}
            onClick={() => setUploadType("excel")}
          >
            📊 Upload DTR Excel
          </button>

          <button
            type="submit"
            className="upload-button"
            disabled={uploading || !canSubmit || hasSubmitted}
            onClick={() => setUploadType("pdf")}
          >
            📄 Upload PDF
          </button>
        </div>
      </form>

      {file && <p className="selected-file">📂 {file.name}</p>}
    </motion.div>
  );
}
