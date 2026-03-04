import React, { useEffect, useState, useRef } from "react";
import api from "../api";
import "./styles/PDFModal.css";

export default function PDFVisualModal({ pdfData, onClose }) {
  const [pages, setPages] = useState([]); // Loaded base64 pages
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const pageCache = useRef({}); // Cache loaded pages for lazy loading

  // Fetch only first page initially
  useEffect(() => {
    if (!pdfData) return;

    const fetchPage = async (pageNum) => {
      try {
        setLoading(true);
        const res = await api.get(
          `/files/pdfs/${pdfData.id}/visual-content/?page=${pageNum}`
        );
        const pageData = res.data.page;
        pageCache.current[pageNum] = pageData;

        // Update state with cached pages
        const cachedPages = Array(totalPages || pageNum)
          .fill(null)
          .map((_, i) => pageCache.current[i + 1] || null);

        setPages(cachedPages);
        setTotalPages(res.data.total_pages || pageNum);
      } catch (err) {
        console.error("Failed to fetch page:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPage(1);
    setCurrentPage(1);
  }, [pdfData]);

  // Lazy load current page if not already loaded
  useEffect(() => {
    if (!pages[currentPage - 1] && totalPages > 0) {
      const fetchCurrent = async () => {
        try {
          setLoading(true);
          const res = await api.get(
            `/files/pdfs/${pdfData.id}/visual-content/?page=${currentPage}`
          );
          pageCache.current[currentPage] = res.data.page;

          const cachedPages = Array(totalPages)
            .fill(null)
            .map((_, i) => pageCache.current[i + 1] || null);

          setPages(cachedPages);
        } catch (err) {
          console.error("Failed to fetch page:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchCurrent();
    }
  }, [currentPage, pages, pdfData, totalPages]);

  const goNext = () =>
    currentPage < totalPages && setCurrentPage(currentPage + 1);
  const goPrev = () =>
    currentPage > 1 && setCurrentPage(currentPage - 1);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentPage, totalPages]);

  if (!pdfData) return null;

  const pageData = pages[currentPage - 1];

  return (
    <div className="pdf-modal-overlay" onClick={onClose}>
      <div
        className="pdf-modal-content"
        onClick={(e) => e.stopPropagation()} // Prevent clicks from closing
      >
        <div className="pdf-modal-header">
          <h2>PROJECT: {pdfData.uploaded_by_name || "Unknown Project"}</h2>
          <button className="close-btn" onClick={onClose}>
            ❌
          </button>
        </div>

        <div className="pdf-page">
          {loading && <p>Loading PDF page...</p>}

          {!loading && !pageData && <p>No page data found.</p>}

          {pageData && (
            <img
              src={`data:image/png;base64,${pageData.image_base64}`}
              alt={`Page ${pageData.page_number}`}
              style={{
                width: "100%",
                borderRadius: "8px",
                border: "1px solid #ccc",
              }}
            />
          )}
        </div>

        {totalPages > 1 && (
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
        )}
      </div>
    </div>
  );
}