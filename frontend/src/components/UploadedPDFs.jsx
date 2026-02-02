/* UploadedPDFs.jsx */
import { useState, useEffect, useMemo } from "react";
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

  // Fetch Parsed DTRs (Excel)
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
    Promise.all([fetchPDFs(), fetchParsedDTRs()]).finally(() =>
      setLoading(false)
    );
  }, [refreshTrigger]);

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  // 🔥 Combine PDFs + Parsed DTRs into ONE list
  const combinedDTRs = useMemo(() => {
    const pdfItems = pdfFiles.map(pdf => ({
      id: `pdf-${pdf.id}`,
      type: "pdf",
      uploaded_at: pdf.uploaded_at,
      data: pdf,
    }));

    const parsedItems = parsedDTRs.map(dtr => ({
      id: `parsed-${dtr.id}`,
      type: "parsed",
      uploaded_at: dtr.uploaded_at,
      data: dtr,
    }));

    return [...pdfItems, ...parsedItems].sort(
      (a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at)
    );
  }, [pdfFiles, parsedDTRs]);

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
      <motion.div
        className="upload-card sidebar1"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        <div
          className="upload-card-header"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <h2 className="upload-title">Uploaded DTRs</h2>
          <button onClick={toggleCollapse} className="collapse-btn">
            {isCollapsed ? "🔽 Show" : "🔼 Hide"}
          </button>
        </div>

        {!isCollapsed && (
          <>
            {loading ? (
              <p>Loading DTRs...</p>
            ) : error ? (
              <p style={{ color: "red" }}>{error}</p>
            ) : combinedDTRs.length === 0 ? (
              <p>No uploaded DTRs yet.</p>
            ) : (
              <div className="pdf-grid">
                {combinedDTRs.map(item => {
                  const { type, data } = item;

                  return (
                    <motion.div
                      key={item.id}
                      className="pdf-card"
                      whileHover={{ scale: 1.03 }}
                      transition={{ duration: 0.2 }}
                    >
                      <p className="pdf-name">
                        {type === "pdf" ? "📄" : "🗂"}{" "}
                        {type === "pdf"
                          ? data.file.split("/").pop()
                          : `${data.employee_name} (${data.employee_no})`}
                      </p>

                      <p className="pdf-info">
                        Source: <strong>{type === "pdf" ? "PDF Upload" : "Excel Upload"}</strong>
                      </p>

                      <p className="pdf-info">
                        Period:{" "}
                        <strong>
                          {type === "pdf"
                            ? data.readable_period || "N/A"
                            : `${data.period_from} → ${data.period_to}`}
                        </strong>
                      </p>

                      <div className="pdf-buttons">
                        <button
                          className="upload-button"
                          onClick={() =>
                            type === "pdf"
                              ? setSelectedPDF(data)
                              : setSelectedParsedDTR(data)
                          }
                        >
                          🧾 View DTR
                        </button>

                        {type === "pdf" && currentUser?.role === "admin" && (
                          <button
                            onClick={() => handleDeletePDF(data.id)}
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
                  );
                })}
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
