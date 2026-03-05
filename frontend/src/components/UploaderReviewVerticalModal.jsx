/* components/UploaderReviewVerticalModal.jsx */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import FileTableVertical from "./FileTableVertical";
import UploadedPDFVertical from "./UploadedPDFVertical";
import "./styles/ClientDashboard.css";
import "./styles/UploaderReviewModal.css";

export default function UploaderReviewVerticalModal({
  uploaders = [],
  currentUser,
  selectedUploader: initialUploader = null,
  onClose,
}) {
  const [selectedUploader, setSelectedUploader] = useState(initialUploader);
  const [refresh, setRefresh] = useState(false);

  // Close modal on ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Do not render if no currentUser
  if (!currentUser) return null;

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
        <div
          className="uploader-modal-header"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <h2 style={{ margin: 0, flex: "1 1 auto" }}>Project Overview</h2>

          {/* Project Selector */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              flex: "0 0 auto",
            }}
          >
            <label style={{ fontWeight: "bold" }}>Select Project:</label>
            <select
              className="upload-button"
              style={{ minWidth: "220px" }}
              value={selectedUploader?.id || ""}
              onChange={(e) => {
                const uploader = uploaders.find(
                  (u) => u.id === Number(e.target.value)
                );
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

          {/* Refresh Button */}
          <button
            onClick={() => setRefresh((prev) => !prev)}
            className="upload-button"
            style={{ marginLeft: "auto", flex: "0 0 auto" }}
          >
            🔄 Refresh Data
          </button>
        </div>

        {/* BODY */}
        <div className="uploader-modal-body vertical-layout" style={{ display: "flex", gap: "1rem", height: "100%" }}>
            {/* LEFT COLUMN: File Table (wider) */}
            <div className="left-column" style={{ flex: 2, minWidth: "0", maxWidth: "80%" }}>
                <FileTableVertical
                role={currentUser?.role || "user"}
                uploaderFilter={selectedUploader?.username || null}
                />
            </div>

            {/* RIGHT COLUMN: Uploaded PDFs / Summary (smaller) */}
            <div className="right-column" style={{ flex: 1.5, minWidth: "0", maxWidth: "40%" }}>
                <UploadedPDFVertical
                refreshTrigger={refresh}
                currentUser={currentUser}
                uploaderFilter={selectedUploader?.username || null}
                />
            </div>
        </div>
      </motion.div>
    </div>
  );
}