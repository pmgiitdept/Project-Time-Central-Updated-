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

  // 15th cutoff → valid until 20
  const cutoff15Start = new Date(year, month, 15);
  const cutoff15End = new Date(year, month, 20);

  // 30th cutoff → valid for 5 days (spills to next month)
  const cutoff30Start = new Date(year, month, 30);
  const cutoff30End = new Date(cutoff30Start);
  cutoff30End.setDate(cutoff30End.getDate() + 15);

  // Previous month 30th cutoff (for early month dates like Jan 2–4)
  const prev30Start = new Date(year, month - 1, 30);
  const prev30End = new Date(prev30Start);
  prev30End.setDate(prev30End.getDate() + 15);

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

  const { canSubmit, message } = getDTRCutoffStatus();

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!canSubmit) return toast.error("Submission is unavailable outside cutoff.");
    if (!file) return toast.error("Select a file first.");

    const fileType = file.type;
    const isExcel = /\.(xlsx|xls|csv)$/i.test(file.name);
    const isPDF = fileType === "application/pdf";

    if (!isExcel && !isPDF) {
      return toast.error("Only Excel (.xlsx, .xls, .csv) or PDF files allowed!");
    }

    setUploading(true);
    const token = localStorage.getItem("access_token");
    const formData = new FormData();
    formData.append("file", file);

    try {
      if (isExcel) {
        // Upload Excel
        const res = await api.post("/files/files/", formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Excel DTR uploaded successfully!");
        refreshFiles();
      } else if (isPDF) {
        // Upload PDF
        await api.post("/files/pdfs/", formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("PDF uploaded successfully!");
        refreshPDFs();
      }

      setHasSubmitted(true); // 🔒 lock after submission
      setFile(null);
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
      <h2 className="upload-title">Upload DTR / PDF</h2>

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
        <button
          type="submit"
          disabled={uploading || !canSubmit || hasSubmitted}
          className="upload-button"
        >
          {hasSubmitted
            ? "Already Submitted"
            : uploading
            ? "Uploading..."
            : "Upload File"}
        </button>
      </form>

      {file && <p className="selected-file">📂 {file.name}</p>}
    </motion.div>
  );
}
