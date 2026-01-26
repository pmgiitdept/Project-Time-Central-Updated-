/* UploadedPDFs.jsx */
import { useState, useEffect } from "react";
import api from "../api";
import { motion } from "framer-motion";
import "./styles/ClientDashboard.css";
import PDFTextModal from "./PDFTextModal";

export default function UploadedPDFs({ refreshTrigger , currentUser, uploaderFilter}) {
  const [pdfFiles, setPdfFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedPDF, setSelectedPDF] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const [previewPDF, setPreviewPDF] = useState(null);

  const getFullPDFUrl = (pdfUrl) => {
    return pdfUrl.startsWith("http")
      ? pdfUrl
      : `${import.meta.env.VITE_API_URL || "http://localhost:8000"}${pdfUrl}`;
  };

  useEffect(() => {
    const fetchPDFs = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/files/pdfs/");
        let data = res.data.results || res.data;

        if (!Array.isArray(data)) {
          console.error("Unexpected response format:", res.data);
          setPdfFiles([]);
          setError("Unexpected response from server");
        } else {
          if (uploaderFilter) {
            data = data.filter(pdf => pdf.uploaded_by === uploaderFilter);
          }
          setPdfFiles(data);
        }
      } catch (err) {
        console.error("Failed to fetch PDFs:", err);
        setPdfFiles([]);
        setError("Failed to fetch PDFs");
      } finally {
        setLoading(false);
      }
    };

    fetchPDFs();

  }, [refreshTrigger]);

  const selectPDF = (pdf) => setSelectedPDF(pdf);

  const viewPDFFile = (pdfUrl) => {
    const fullUrl = pdfUrl.startsWith("http")
      ? pdfUrl
      : `${import.meta.env.VITE_API_URL || "http://localhost:8000"}${pdfUrl}`;
    window.open(fullUrl, "_blank");
  };

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

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
      {/* Left sidebar for PDFs */}
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
              <p>Loading PDFs...</p>
            ) : error ? (
              <p style={{ color: "red" }}>{error}</p>
            ) : pdfFiles.length === 0 ? (
              <p>No PDFs uploaded yet.</p>
            ) : (
              <div className="pdf-grid">
                {pdfFiles.map((pdf) => (
                  <motion.div
                    key={pdf.id}
                    className="pdf-card"
                    whileHover={{ scale: 1.03 }}
                    transition={{ duration: 0.2 }}
                  >
                    <p className="pdf-name">📄 {pdf.file.split("/").pop()}</p>
                    <p className="pdf-info">
                      Uploaded: <strong>{new Date(pdf.uploaded_at).toLocaleString()}</strong>
                    </p>
                    <p className="pdf-info">
                      Period: <strong>{pdf.readable_period || "N/A"}</strong>
                    </p>
                    <p className="pdf-info">
                      PROJECT: <strong>{pdf.uploaded_by_name || "N/A"}</strong>
                    </p>

                    <div className="pdf-buttons">
                      <button onClick={() => selectPDF(pdf)} className="upload-button">
                        🧾 View DTR
                      </button>
                      {/* <button
                        onClick={() => viewPDFFile(pdf.file)}
                        className="upload-button view-pdf-btn"
                      >
                        📄 View PDF File
                      </button> */}
                      <button
                        onClick={() => setPreviewPDF(pdf)}
                        className="upload-button"
                        style={{ background: "#6c757d" }}
                      >
                        📄 View PDF
                      </button>
                      {/* Delete Button - Only Visible to Admin */}
                      {currentUser?.role === "admin" && (
                        <button
                          onClick={() => handleDeletePDF(pdf.id)}
                          className="upload-button delete-btn"
                          style={{
                            background: "#e63946",
                            color: "white",
                            marginLeft: "0.5rem",
                          }}
                        >
                          🗑️ Delete
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* Main content for PDF viewer */}
      {selectedPDF && (
        <PDFTextModal
          pdfData={selectedPDF}
          currentUser={currentUser}
          onClose={() => setSelectedPDF(null)}
        />
      )}
    </div>
  );
}
