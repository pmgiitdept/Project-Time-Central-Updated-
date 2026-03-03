/* UploadedPDFs.jsx */
import { useState, useEffect } from "react";
import api from "../api";
import { motion } from "framer-motion";
import "./styles/ClientDashboard.css";
import PDFTextModal from "./PDFTextModal";
import ParsedDTRModal from "./ParsedDTRModal";

export default function UploadedPDFs({ refreshTrigger, currentUser, uploaderFilter }) {
  const [pdfFiles, setPdfFiles] = useState([]);
  const [parsedDTRs, setParsedDTRs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedPDF, setSelectedPDF] = useState(null);
  const [selectedParsedDTR, setSelectedParsedDTR] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Fetch PDFs
  const fetchPDFs = async () => {
    try {
      const res = await api.get("/files/pdfs/");
      let data = res.data.results || res.data;
      if (uploaderFilter) {
        data = data.filter(pdf => pdf.uploaded_by === uploaderFilter);
      }
      setPdfFiles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch PDFs:", err);
      setError("Failed to fetch PDFs");
      setPdfFiles([]);
    }
  };

  // Fetch Parsed DTRs
  const fetchParsedDTRs = async () => {
    try {
      const res = await api.get("/files/parsed-dtrs/");
      let data = res.data.results || res.data;
      if (uploaderFilter) {
        data = data.filter(dtr => dtr.uploaded_by === uploaderFilter);
      }
      setParsedDTRs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch Parsed DTRs:", err);
      setParsedDTRs([]);
    }
  };

  useEffect(() => {
    setLoading(true);
    setError("");
    Promise.all([fetchPDFs(), fetchParsedDTRs()]).finally(() => setLoading(false));
  }, [refreshTrigger]);

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  const selectPDF = (pdf) => setSelectedPDF(pdf);
  const selectParsedDTR = (dtr) => setSelectedParsedDTR(dtr);

  const handleDeletePDF = async (pdfId) => {
    const confirmed = window.confirm("Are you sure you want to delete this PDF?");
    if (!confirmed) return;

    try {
      await api.delete(`/files/pdfs/${pdfId}/`);
      setPdfFiles(prev => prev.filter(p => p.id !== pdfId));
      alert("PDF deleted successfully!");
    } catch (err) {
      console.error("Failed to delete PDF:", err);
      alert("Failed to delete the PDF. Please try again.");
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Left sidebar for PDFs and Parsed DTRs */}
      <motion.div
        className="upload-card sidebar1"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        <div className="upload-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 className="upload-title">Uploaded DTRs</h2>
          <button onClick={toggleCollapse} className="collapse-btn">
            {isCollapsed ? "🔽 Show" : "🔼 Hide"}
          </button>
        </div>

        {!isCollapsed && (
          <>
            {loading ? (
              <p>Loading files...</p>
            ) : error ? (
              <p style={{ color: "red" }}>{error}</p>
            ) : pdfFiles.length === 0 && parsedDTRs.length === 0 ? (
              <p>No uploaded DTRs yet.</p>
            ) : (
              <div className="pdf-grid">
                {/* Render PDF files */}
                {pdfFiles.map(pdf => (
                  <motion.div key={pdf.id} className="pdf-card" whileHover={{ scale: 1.03 }} transition={{ duration: 0.2 }}>
                    <p className="pdf-name">📄 {pdf.file.split("/").pop()}</p>
                    <p className="pdf-info">Uploaded: <strong>{new Date(pdf.uploaded_at).toLocaleString()}</strong></p>
                    <p className="pdf-info">Period: <strong>{pdf.readable_period || "N/A"}</strong></p>
                    <p className="pdf-info">Project: <strong>{pdf.uploaded_by_name || "N/A"}</strong></p>

                    <div className="pdf-buttons">
                      <button onClick={() => selectPDF(pdf)} className="upload-button">🧾 View DTR</button>
                      {currentUser?.role === "admin" && (
                        <button
                          onClick={() => handleDeletePDF(pdf.id)}
                          className="upload-button delete-btn"
                          style={{ background: "#e63946", color: "white", marginLeft: "0.5rem" }}
                        >
                          🗑️ Delete
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}

                {/* Render Parsed DTRs */}
                {parsedDTRs.map(dtr => (
                  <motion.div key={dtr.id} className="pdf-card" whileHover={{ scale: 1.03 }} transition={{ duration: 0.2 }}>
                    <p className="pdf-name">🗂 {dtr.employee_name} ({dtr.employee_no})</p>
                    <p className="pdf-info">Period: <strong>{dtr.period_from} → {dtr.period_to}</strong></p>
                    <p className="pdf-info">Project: <strong>{dtr.project || "N/A"}</strong></p>

                    <div className="pdf-buttons">
                      <button onClick={() => selectParsedDTR(dtr)} className="upload-button">🧾 View Parsed DTR</button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* Modals */}
      {selectedPDF && (
        <PDFTextModal
          pdfData={selectedPDF}
          currentUser={currentUser}
          onClose={() => setSelectedPDF(null)}
        />
      )}

      {selectedParsedDTR && (
        <ParsedDTRModal
          dtrData={selectedParsedDTR}
          currentUser={currentUser}
          onClose={() => setSelectedParsedDTR(null)}
        />
      )}
    </div>
  );
}
