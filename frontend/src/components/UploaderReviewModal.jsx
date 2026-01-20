import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import FileTable from "./FileTable";
import FileContent from "./FileContent";
import UploadedPDFs from "./UploadedPDFs";
import "./styles/ClientDashboard.css";
import "./styles/UploaderReviewModal.css";
export default function UploaderReviewModal({ uploader, onClose }) {
  const [selectedFile, setSelectedFile] = useState(null);

  const rightContentRef = useRef(null);
  const topScrollRef = useRef(null);
  const [leftWidth, setLeftWidth] = useState(65); // percent width of left column
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

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

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!uploader) return null;

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
          <h2>Uploader Review: {uploader.username}</h2>
        </div>

        {/* Body */}
        <div className="uploader-modal-body full-util" ref={containerRef}>

          {/* LEFT COLUMN */}
          <div
            className="uploader-column left full-height"
            style={{ width: `${leftWidth}%` }}
          >
            <div className="file-table-wrapper full-height">
              <div className="file-table-left">
                <FileTable
                  role="admin"
                  uploaderFilter={uploader.id}
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

          {/* SPLITTER */}
          <motion.div
            className={`horizontal-splitter ${!isDragging ? "auto-hide" : ""}`}
            drag="x"
            dragConstraints={containerRef}
            dragElastic={0}
            style={{ left: `calc(${leftWidth}% - 3px)` }}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={() => setIsDragging(false)}
            onDrag={(e, info) => {
              const container = containerRef.current;
              if (!container) return;

              const bounds = container.getBoundingClientRect();
              const newPercent =
                ((info.point.x - bounds.left) / bounds.width) * 100;

              if (newPercent > 30 && newPercent < 80) {
                setLeftWidth(newPercent);
              }
            }}
          />

          {/* RIGHT COLUMN */}
          <div
            className="uploader-column right full-height"
            style={{ flex: 1 }}
          >
            {/* Top scrollbar and content */}
            <div className="right-top-scrollbar" ref={topScrollRef}>
              <div className="scroll-inner" />
            </div>

            <div className="right-content-scroll" ref={rightContentRef}>
              <UploadedPDFs
                uploaderFilter={uploader.id}
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
