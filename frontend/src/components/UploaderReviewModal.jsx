import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import FileTable from "./FileTable";
import FileContent from "./FileContent";
import UploadedPDFs from "./UploadedPDFs";
import "./styles/ClientDashboard.css";

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
        <div className="uploader-modal-body full-util">

          {/* LEFT COLUMN */}
          <div className="uploader-column left full-height">
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

          {/* RIGHT COLUMN */}
          <div className="uploader-column right full-height">
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
