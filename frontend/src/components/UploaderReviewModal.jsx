/* components/UploaderReviewModal.jsx */
import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import FileTable from "./FileTable";
import FileContent from "./FileContent";
import UploadedPDFs from "./UploadedPDFs";
import "./styles/ClientDashboard.css";
import "./styles/UploaderReviewModal.css";

export default function UploaderReviewModal({ uploader, uploaders = [], onClose }) {
  const [selectedUploader, setSelectedUploader] = useState(uploader); // start with current uploader
  const [selectedFile, setSelectedFile] = useState(null);

  const rightContentRef = useRef(null);
  const topScrollRef = useRef(null);

  useEffect(() => {
    if (!uploaders.length) return;

    // Ensure selectedUploader exists in uploaders list
    const match = uploaders.find(u => u.id === uploader?.id);

    if (match) {
      setSelectedUploader(match);
    } else {
      setSelectedUploader(uploaders[0]); // fallback
    }
  }, [uploaders, uploader]);

  // --- Scroll sync logic
  useEffect(() => {
    const topScroll = topScrollRef.current;
    const content = rightContentRef.current;
    if (!topScroll || !content) return;

    const syncTop = () => (content.scrollLeft = topScroll.scrollLeft);
    const syncContent = () => (topScroll.scrollLeft = content.scrollLeft);

    topScroll.addEventListener("scroll", syncTop);
    content.addEventListener("scroll", syncContent);

    return () => {
      topScroll.removeEventListener("scroll", syncTop);
      content.removeEventListener("scroll", syncContent);
    };
  }, []);

  // --- ESC key closes modal
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!selectedUploader) return null;

  return (
    <div className="uploader-modal-overlay" onClick={onClose}>
      <motion.div
        className="uploader-modal expanded"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.25 }}
      >
        {/* Header */}
        <div className="uploader-modal-header">
          <h2>Uploader Review: {selectedUploader.username}</h2>
        </div>

        {/* Select Uploader Dropdown */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            padding: "0.5rem 1rem",
            borderBottom: "1px solid #ddd",
            background: "#f8f9fa",
          }}
        >
          <label style={{ fontWeight: "bold" }}>Select Uploader:</label>
          <select
            className="upload-button"
            value={selectedUploader?.id || ""}
            onChange={(e) => {
              const newUploader = (uploaders || []).find(
                (u) => u.id === Number(e.target.value)
              );
              setSelectedUploader(newUploader);
              setSelectedFile(null);
            }}
          >
            {(uploaders || []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.username}
              </option>
            ))}
          </select>

          <span style={{ fontSize: "0.8rem", opacity: 0.7 }}>
            Select an uploader to review their files and PDFs
          </span>
        </div>

        {/* Body */}
        <div className="uploader-modal-body full-util">
          {/* LEFT COLUMN */}
          <div className="uploader-column left full-height">
            <div className="file-table-wrapper full-height">
              <div className="file-table-left">
                <FileTable
                  role="admin"
                  uploaderFilter={selectedUploader.id}
                  setSelectedFile={setSelectedFile}
                  embedded
                />
              </div>
              {selectedFile && (
                <div className="file-content-right">
                  <FileContent fileId={selectedFile.id} role="admin" />
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="uploader-column right full-height">
            <div className="right-top-scrollbar" ref={topScrollRef}>
              <div className="scroll-inner" />
            </div>
            <div className="right-content-scroll" ref={rightContentRef}>
              <UploadedPDFs
                uploaderFilter={selectedUploader.id}
                currentUser={{ role: "admin" }}
                embedded
              />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
