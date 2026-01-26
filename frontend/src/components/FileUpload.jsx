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
        await api.post("/files/files/", formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Excel DTR uploaded successfully!");
        refreshFiles();
      } else if (isPDF) {
        await api.post("/files/pdfs/", formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("PDF uploaded successfully!");
        refreshPDFs();
      }

      setHasSubmitted(true);
      setFile(null);
    } catch (err) {
      console.error(err);
      toast.error("File upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const scrollToUploaded = () => {
    const section = document.getElementById("uploaded-pdfs");
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    } else {
      toast.info("Uploaded DTRs section not found.");
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

      {/* NEW BUTTON */}
      <button
        type="button"
        onClick={scrollToUploaded}
        className="upload-button"
        style={{ marginTop: "0.75rem", background: "#457b9d" }}
      >
        📂 View Uploaded DTRs
      </button>

      {file && <p className="selected-file">📂 {file.name}</p>}
    </motion.div>
  );
}
