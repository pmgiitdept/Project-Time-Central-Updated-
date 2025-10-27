// components/FileUpload.jsx
import { useState } from "react";
import api from "../api";
import { toast } from "react-toastify";
import "./styles/ClientDashboard.css"; 
import { motion } from "framer-motion";

export default function FileUpload({ refreshFiles, refreshPDFs }) {
  const [dtrFile, setDtrFile] = useState(null);
  const [uploadingDTR, setUploadingDTR] = useState(false);

  const [pdfFile, setPdfFile] = useState(null);
  const [uploadingPDF, setUploadingPDF] = useState(false);

  const handleDTRUpload = async (e) => {
    e.preventDefault();
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
      setDtrFile(null);
      refreshFiles();
    } catch (err) {
      console.error(err);
      toast.error("DTR upload failed.");
    } finally {
      setUploadingDTR(false);
    }
  };

  const handlePDFUpload = async (e) => {
    e.preventDefault();
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
      <h2 className="upload-title">Upload Files</h2>

      <div className="upload-side-by-side">
        {/* DTR Upload */}
        <div className="upload-section">
          <h3>Payroll Report</h3>
          <form onSubmit={handleDTRUpload} className="upload-form">
            <input
              type="file"
              onChange={(e) => setDtrFile(e.target.files[0])}
              className="file-input"
            />
            <button type="submit" disabled={uploadingDTR} className="upload-button">
              {uploadingDTR ? "Uploading..." : "Upload / Overwrite"}
            </button>
          </form>
          {dtrFile && <p className="selected-file">📂 {dtrFile.name}</p>}
        </div>

        {/* PDF Upload */}
        <div className="upload-section">
          <h3>DTR Standard</h3>
          <form onSubmit={handlePDFUpload} className="upload-form">
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setPdfFile(e.target.files[0])}
              className="file-input"
            />
            <button type="submit" disabled={uploadingPDF} className="upload-button">
              {uploadingPDF ? "Uploading..." : "Upload PDF"}
            </button>
          </form>
          {pdfFile && <p className="selected-file">📂 {pdfFile.name}</p>}
        </div>
      </div>
    </motion.div>
  );
}
