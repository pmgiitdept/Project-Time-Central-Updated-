{/* components/FileUpload.jsx */}
import { useState } from "react";
import api from "../api";
import { toast } from "react-toastify";
import "./styles/ClientDashboard.css";
import { motion } from "framer-motion";
import { parseDTRExcel } from "../utils/parseDTRExcel";

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

  const handleExcelUpload = async () => {
    if (!file) return toast.error("Select an Excel file first.");

    try {
      setUploading(true);

      const parsedDTRs = await parseDTRExcel(file);

      console.log("Parsed DTR Excel:", parsedDTRs);

      toast.success(`Parsed ${parsedDTRs.length} DTR sheet(s) successfully`);

      // 🔜 NEXT:
      // setPreviewData(parsedDTRs)
      // OR send JSON to backend

      setHasSubmitted(true);
      setFile(null);
    } catch (err) {
      console.error(err);
      toast.error("Invalid DTR Excel format.");
    } finally {
      setUploading(false);
    }
  };

  const handlePDFUpload = async () => {
    if (!file) return toast.error("Select a PDF file first.");

    try {
      setUploading(true);
      const token = localStorage.getItem("access_token");
      const formData = new FormData();
      formData.append("file", file);

      await api.post("/files/pdfs/", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("PDF uploaded successfully!");
      refreshPDFs();

      setHasSubmitted(true);
      setFile(null);
    } catch (err) {
      console.error(err);
      toast.error("PDF upload failed.");
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

      <input
        type="file"
        accept=".xlsx,.xls,.csv,application/pdf"
        onChange={(e) => setFile(e.target.files[0])}
        className="file-input"
      />

      <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
        <button
          type="button"
          className="upload-button"
          disabled={uploading || !canSubmit || hasSubmitted}
          onClick={handleExcelUpload}
        >
          📊 Upload DTR Excel
        </button>

        <button
          type="button"
          className="upload-button"
          disabled={uploading || !canSubmit || hasSubmitted}
          onClick={handlePDFUpload}
        >
          📄 Upload PDF
        </button>
      </div>

      {file && <p className="selected-file">📂 {file.name}</p>}
    </motion.div>
  );
}
