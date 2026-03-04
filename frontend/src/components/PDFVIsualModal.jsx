import React, { useEffect, useState } from "react";
import api from "../api";
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
        const res = await api.get(`/files/pdfs/${pdfData.id}/visual-content/`);
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

  const goNext = () => currentPage < totalPages && setCurrentPage(currentPage + 1);
  const goPrev = () => currentPage > 1 && setCurrentPage(currentPage - 1);

  return (
    <div className="pdf-card-container">
      {/* Header */}
      <div className="pdf-card-header">
        <h3>
          PROJECT: <strong>{pdfData.uploaded_by_name || "Unknown Project"}</strong>
        </h3>
        <button className="export-button" onClick={onClose}>
          ❌ Close
        </button>
      </div>

      {/* Body */}
      <div className="pdf-card-body" style={{ textAlign: "center" }}>
        {loading ? (
          <p>Loading PDF pages...</p>
        ) : totalPages === 0 ? (
          <p>No pages found.</p>
        ) : (
          <>
            {pageData?.image_base64 ? (
              <div style={{ marginBottom: "1.5rem" }}>
                <img
                  src={`data:image/png;base64,${pageData.image_base64}`}
                  alt={`Page ${pageData.page_number}`}
                  style={{
                    width: "100%",
                    borderRadius: "8px",
                    border: "1px solid #ccc",
                  }}
                />
              </div>
            ) : (
              <p>Failed to load page.</p>
            )}

            {/* Pagination */}
            <div className="pagination-controls1">
              <button onClick={goPrev} disabled={currentPage === 1}>
                ◀ Prev
              </button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <button onClick={goNext} disabled={currentPage === totalPages}>
                Next ▶
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}