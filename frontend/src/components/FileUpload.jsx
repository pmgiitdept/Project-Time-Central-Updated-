// components/FileUpload.jsx
import { useState } from "react";
import api from "../api";
import { toast } from "react-toastify";
import "./styles/ClientDashboard.css"; 
import { motion } from "framer-motion";

/* ======== Cutoff Logic Function ======== */
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
  cutoff30End.setDate(cutoff30End.getDate() + 5);

  // Previous month 30th cutoff (for early month dates like Jan 2–4)
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
  const [dtrFile, setDtrFile] = useState(null);
  const [uploadingDTR, setUploadingDTR] = useState(false);
  const [hasSubmittedDTR, setHasSubmittedDTR] = useState(false);

  const [pdfFile, setPdfFile] = useState(null);
  const [uploadingPDF, setUploadingPDF] = useState(false);
  const [hasSubmittedPDF, setHasSubmittedPDF] = useState(false);

  /* ======== Cutoff Status ======== */
  const { canSubmit, message } = getDTRCutoffStatus();

  /* ======== DTR Upload ======== */
  const handleDTRUpload = async (e) => {
    e.preventDefault();
    if (!canSubmit) return toast.error("Submission is unavailable outside cutoff.");
    if (!dtrFile) return toast.error("Select a DTR file first.");

    setUploadingDTR(true);
    const token = localStorage.getItem("access_token");
    const formData = new FormData();
    formData.append("file", dtrFile);

    try {
      await api.post("/files/files/", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("DTR uploaded successfully!");
      setHasSubmittedDTR(true); // 🔒 lock after submission
      setDtrFile(null);
      refreshFiles();
    } catch (err) {
      console.error(err);
      toast.error("DTR upload failed.");
    } finally {
      setUploadingDTR(false);
    }
  };

  /* ======== PDF Upload ======== */
  const handlePDFUpload = async (e) => {
    e.preventDefault();
    if (!canSubmit) return toast.error("Submission is unavailable outside cutoff.");
    if (!pdfFile) return toast.error("Select a PDF first.");
    if (pdfFile.type !== "application/pdf") return toast.error("Only PDF files allowed!");

    setUploadingPDF(true);
    const token = localStorage.getItem("access_token");
    const formData = new FormData();
    formData.append("file", pdfFile);

    try {
      await api.post("/files/pdfs/", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("PDF uploaded successfully!");
      setHasSubmittedPDF(true); // 🔒 lock after submission
      setPdfFile(null);
      refreshPDFs();
    } catch (err) {
      console.error(err);
      toast.error("PDF upload failed.");
    } finally {
      setUploadingPDF(false);
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
      <h2 className="upload-title">Upload DTR Standard</h2>

      <p
        style={{
          fontSize: "0.9rem",
          color: canSubmit ? "green" : "red",
          marginBottom: "1rem",
        }}
      >
        {message}
      </p>

      <div className="upload-side-by-side">
        {/* DTR Upload */}
        <div className="upload-section">
          <form onSubmit={handleDTRUpload} className="upload-form">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setDtrFile(e.target.files[0])}
              className="file-input"
            />
            <button
              type="submit"
              disabled={uploadingDTR || !canSubmit || hasSubmittedDTR}
              className="upload-button"
            >
              {hasSubmittedDTR
                ? "DTR Already Submitted"
                : uploadingDTR
                ? "Uploading..."
                : "Upload DTR"}
            </button>
          </form>
          {dtrFile && <p className="selected-file">📊 {dtrFile.name}</p>}
        </div>

        {/* PDF Upload */}
        <div className="upload-section">
          <form onSubmit={handlePDFUpload} className="upload-form">
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setPdfFile(e.target.files[0])}
              className="file-input"
            />
            <button
              type="submit"
              disabled={uploadingPDF || !canSubmit || hasSubmittedPDF}
              className="upload-button"
            >
              {hasSubmittedPDF
                ? "PDF Already Submitted"
                : uploadingPDF
                ? "Uploading..."
                : "Upload PDF"}
            </button>
          </form>
          {pdfFile && <p className="selected-file">📂 {pdfFile.name}</p>}
        </div>
      </div>
    </motion.div>
  );
}
