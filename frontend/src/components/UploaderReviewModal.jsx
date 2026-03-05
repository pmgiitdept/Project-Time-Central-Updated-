/* components/UploaderReviewModal.jsx */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import FileTable from "./FileTable";
import FileContent from "./FileContent";
import UploadedPDFs from "./UploadedPDFs";
import "./styles/ClientDashboard.css";
import "./styles/UploaderReviewModal.css";

export default function UploaderReviewModal({ uploader, uploaders = [], onClose }) {
  const [selectedUploader, setSelectedUploader] = useState(uploader);
  const [selectedFile, setSelectedFile] = useState(null);

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

        {/* HEADER */}
        <div className="uploader-modal-header">
          <h2>Uploader Review: {selectedUploader.username}</h2>
        </div>

        {/* BODY */}
        <div className="uploader-modal-body review-layout">

          {/* LEFT SIDE (DTR DATA) */}
          <div className="review-left">

            {/* FileTable */}
            <div className="review-table">
              <FileTable
                role="admin"
                uploaderFilter={selectedUploader.id}
                setSelectedFile={setSelectedFile}
                embedded
              />
            </div>

            {/* FileContent */}
            <div className="review-content">
              {selectedFile ? (
                <FileContent
                  fileId={selectedFile.id}
                  role="admin"
                />
              ) : (
                <div className="empty-content">
                  <p>Select a file to view its contents.</p>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT SIDE (PDF REVIEW) */}
          <div className="review-right">

            <UploadedPDFs
              uploaderFilter={selectedUploader.id}
              currentUser={{ role: "admin" }}
              embedded
              viewerMode
            />

          </div>

        </div>
      </motion.div>
    </div>
  );
}