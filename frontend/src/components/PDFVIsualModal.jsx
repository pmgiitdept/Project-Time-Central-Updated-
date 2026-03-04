import { useEffect, useState } from "react";
import api from "../api";
import { motion } from "framer-motion";

export default function PDFVisualModal({ pdfData, onClose }) {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  useEffect(() => {
    const fetchVisualContent = async () => {
      try {
        setLoading(true);
       const res = await api.get(
        `/files/pdfs/${pdfData.id}/visual-content/`
        );
        setPages(res.data.pages || []);
        setCurrentPageIndex(0); // reset to first page
      } catch (err) {
        console.error("Failed to fetch visual content:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVisualContent();
  }, [pdfData]);

  const nextPage = () => {
    if (currentPageIndex < pages.length - 1) {
      setCurrentPageIndex(prev => prev + 1);
    }
  };

  const prevPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(prev => prev - 1);
    }
  };

  const currentPage = pages[currentPageIndex];

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ overflowY: "auto" }}
    >
      <div className="modal-content" style={{ maxWidth: "900px" }}>
        <button onClick={onClose} className="close-btn">
          ❌ Close
        </button>

        {loading ? (
          <p>Loading PDF pages...</p>
        ) : pages.length === 0 ? (
          <p>No pages found.</p>
        ) : (
          <>
            {/* Pagination Controls */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: "1rem",
                gap: "1rem",
              }}
            >
              <button
                onClick={prevPage}
                disabled={currentPageIndex === 0}
                className="upload-button"
              >
                ⬅ Previous
              </button>

              <span>
                Page <strong>{currentPageIndex + 1}</strong> of{" "}
                <strong>{pages.length}</strong>
              </span>

              <button
                onClick={nextPage}
                disabled={currentPageIndex === pages.length - 1}
                className="upload-button"
              >
                Next ➡
              </button>
            </div>

            {/* Current Page Image */}
            <div style={{ textAlign: "center" }}>
              <img
                src={`data:image/png;base64,${currentPage.image_base64}`}
                alt={`Page ${currentPage.page_number}`}
                style={{
                  width: "100%",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                }}
              />
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}