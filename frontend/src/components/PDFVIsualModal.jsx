import React, { useEffect, useState } from "react";
import api from "../api";
import { motion } from "framer-motion";
import "./styles/PDFModal.css";

export default function PDFVisualModal({ pdfData, onClose }) {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!pdfData) return;

    const fetchVisualContent = async () => {
      try {
        setLoading(true);
        const res = await api.get(
          `/files/pdfs/${pdfData.id}/visual-content/`
        );
        setPages(res.data.pages || []);
        setCurrentPage(1);
      } catch (err) {
        console.error("Failed to fetch visual content:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVisualContent();
  }, [pdfData]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentPage, pages.length]);

  if (!pdfData) return null;

  const totalPages = pages.length;
  const pageData = pages[currentPage - 1];

  const goNext = () =>
    currentPage < totalPages && setCurrentPage(currentPage + 1);

  const goPrev = () =>
    currentPage > 1 && setCurrentPage(currentPage - 1);

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
        zIndex: 9999,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        className="pdf-card-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "95%",
          maxWidth: "1000px",
          maxHeight: "95vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div className="pdf-card-header">
          <h3>
            PROJECT:{" "}
            <strong>{pdfData.uploaded_by_name || "Unknown Project"}</strong>
          </h3>

          <button className="export-button" onClick={onClose}>
            ❌ Close
          </button>
        </div>

        <div
          className="pdf-card-body"
          style={{
            overflowY: "auto",
            textAlign: "center",
          }}
        >
          {loading ? (
            <p>Loading PDF pages...</p>
          ) : totalPages === 0 ? (
            <p>No pages found.</p>
          ) : (
            <>
              <img
                src={`data:image/png;base64,${pageData?.image_base64}`}
                alt={`Page ${pageData?.page_number}`}
                style={{
                  width: "100%",
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  marginBottom: "20px",
                }}
              />

              <div className="pagination-controls1">
                <button onClick={goPrev} disabled={currentPage === 1}>
                  ◀ Prev
                </button>

                <span>
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={goNext}
                  disabled={currentPage === totalPages}
                >
                  Next ▶
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}