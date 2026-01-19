import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import FileTable from "./FileTable";
import DTRTable from "./DTRTable";
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
        </div>

        {/* Body: Two Columns */}
        <div className="uploader-modal-body two-column">
          {/* LEFT: File Table */}
          <div className="uploader-column table-column">
            <FileTable
              role="admin"
              uploaderFilter={uploader.id}
              setSelectedFile={setSelectedFile}
              embedded
            />
          </div>

          {/* RIGHT: DTRTable + Uploaded PDFs */}
          <div className="uploader-column content-column">
            {selectedFile && (
              <div className="dtr-pdf-wrapper">
                <div className="dtr-table-wrapper">
                  <DTRTable role="admin" fileId={selectedFile.id} />
                </div>
                <div className="uploaded-pdfs-wrapper">
                  <UploadedPDFs
                    uploaderFilter={uploader.id}
                    currentUser={{ role: "admin" }}
                    embedded
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
