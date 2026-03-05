/* components/UploaderReviewVerticalModal.jsx */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import FileTableVertical from "./FileTableVertical";
import UploadedPDFVertical from "./UploadedPDFVertical";
import "./styles/ClientDashboard.css";
import "./styles/UploaderReviewModal.css";

export default function UploaderReviewVerticalModal({ uploaders = [], currentUser, onClose }) {
  const [selectedUploader, setSelectedUploader] = useState(null);
  const [refresh, setRefresh] = useState(false);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <div className="uploader-modal-overlay" onClick={onClose}>
      <motion.div
        className="uploader-modal expanded vertical"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.25 }}
      >
        {/* HEADER */}
        <div className="uploader-modal-header">
          <h2>Project Overview</h2>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <label style={{ fontWeight: "bold" }}>Select Project:</label>
            <select
              className="upload-button"
              style={{ minWidth: "250px" }}
              value={selectedUploader?.id || ""}
              onChange={(e) => {
                const uploader = uploaders.find((u) => u.id === Number(e.target.value));
                setSelectedUploader(uploader || null);
              }}
            >
              <option value="">All Projects</option>
              {uploaders.map((uploader) => (
                <option key={uploader.id} value={uploader.id}>
                  {uploader.username}
                </option>
              ))}
            </select>
          </div>

          <button onClick={() => setRefresh(!refresh)} className="upload-button" style={{ marginLeft: "auto" }}>
            🔄 Refresh Data
          </button>
        </div>

        {/* BODY */}
        <div className="uploader-modal-body vertical-layout">
          {/* LEFT COLUMN: File Table */}
          <div className="left-column">
            {selectedUploader ? (
              <FileTableVertical role={currentUser.role} uploaderFilter={selectedUploader.username} />
            ) : (
              <FileTableVertical role={currentUser.role} />
            )}
          </div>

          {/* RIGHT COLUMN: Uploaded PDFs */}
          <div className="right-column">
            {selectedUploader ? (
              <UploadedPDFVertical refreshTrigger={refresh} currentUser={currentUser} uploaderFilter={selectedUploader.username} />
            ) : (
              <UploadedPDFVertical refreshTrigger={refresh} currentUser={currentUser} />
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}