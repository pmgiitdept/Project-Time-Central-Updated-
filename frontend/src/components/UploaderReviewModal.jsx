import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import FileTable from "./FileTable";
import FileContent from "./FileContent";
import UploadedPDFs from "./UploadedPDFs";
import "./styles/ClientDashboard.css";
import "./styles/UploaderReviewModal.css";
export default function UploaderReviewModal({ uploader, onClose }) {
  const [selectedFile, setSelectedFile] = useState(null);

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
        <div className="uploader-modal-body three-column">
          {/* COLUMN 1 — FILE TABLE */}
          <div className="uploader-column table-column">
            <FileTable
              role="admin"
              uploaderFilter={uploader.id}
              setSelectedFile={setSelectedFile}
              embedded
            />
          </div>

          {/* COLUMN 2 — FILE CONTENT */}
          <div className="uploader-column content-column">
            {selectedFile && (
              <FileContent fileId={selectedFile.id} role="admin" />
            )}
          </div>

          {/* COLUMN 3 — PDFs */}
          <div className="uploader-column pdf-column">
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
