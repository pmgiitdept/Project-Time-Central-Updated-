import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import FileTable from "./FileTable";
import FileContent from "./FileContent";
import UploadedPDFs from "./UploadedPDFs";
import "./styles/UploaderReviewModal.css"; // make sure to point to the correct CSS

export default function UploaderReviewModal({ uploader, onClose }) {
  const [selectedFile, setSelectedFile] = useState(null);

  // Close on ESC
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
        className="uploader-modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.25 }}
      >
        {/* Header */}
        <div className="uploader-modal-header">
          <h2>Uploader Review: {uploader.username}</h2>
          <button className="close-btn" onClick={onClose}>✖</button>
        </div>

        {/* Body */}
        <div className="uploader-modal-body compact">

          {/* LEFT COLUMN */}
          <div className="uploader-column left">
            <div className="file-table-wrapper">
              {/* Summary Forms Table */}
              <div className="file-table-left">
                <h3>Summary Forms</h3>
                <FileTable
                  role="admin"
                  uploaderFilter={uploader.id}
                  setSelectedFile={setSelectedFile}
                  embedded
                />
              </div>

              {/* File Content */}
              <div className="file-content-right">
                {selectedFile && (
                  <div className="file-content-wrapper">
                    <FileContent fileId={selectedFile.id} role="admin" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: DTR PDFs */}
          <div className="uploader-column right">
            <h3>DTR PDFs</h3>
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
