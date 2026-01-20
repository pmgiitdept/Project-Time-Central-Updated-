import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import FileTable from "./FileTable";
import FileContent from "./FileContent";
import UploadedPDFs from "./UploadedPDFs";
import "./styles/ClientDashboard.css";
import "./styles/UploaderReviewModal.css";
export default function UploaderReviewModal({ uploader, onClose }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [leftWidth, setLeftWidth] = useState(65); // %
  const containerRef = useRef(null);

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
        <div
            className="uploader-modal-body full-util"
            ref={containerRef}
          >

          {/* LEFT COLUMN */}
          <div className="uploader-column left full-height" style={{ flex: `0 0 ${leftWidth}%` }}>
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
          
          <motion.div
            className="horizontal-splitter"
            drag="x"
            dragConstraints={containerRef}
            dragElastic={0}
            onDrag={(e, info) => {
              const containerWidth = containerRef.current.offsetWidth;
              const newPercent =
                ((info.point.x - containerRef.current.getBoundingClientRect().left) /
                  containerWidth) *
                100;

              if (newPercent > 30 && newPercent < 80) {
                setLeftWidth(newPercent);
              }
            }}
          />

          {/* RIGHT COLUMN */}
          <div
            className="uploader-column right full-height"
            style={{ flex: `0 0 ${100 - leftWidth}%` }}
          >
            <UploadedPDFs
              uploaderFilter={uploader.id}
              currentUser={{ role: "admin" }}
              embedded
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
