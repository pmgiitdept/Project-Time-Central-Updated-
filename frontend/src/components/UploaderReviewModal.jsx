// components/UploaderReviewModal.jsx
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaTimes,
  FaCheckCircle,
  FaBan,
  FaDownload,
  FaFilePdf,
} from "react-icons/fa";
import api from "../api";
import "./styles/UploaderReviewModal.css";

export default function UploaderReviewModal({
  uploader,
  onClose,
  onActionComplete,
}) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uploader) return;

    const fetchUploaderFiles = async () => {
      try {
        const res = await api.get(
          `/files/dtr/files/?uploaded_by=${uploader.id}`
        );
        setFiles(res.data.results || res.data);
      } catch (err) {
        console.error("Failed to load uploader files:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUploaderFiles();
  }, [uploader]);

  const updateStatus = async (fileId, status) => {
    try {
      await api.patch(`/files/dtr/files/${fileId}/`, { status });
      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, status } : f))
      );
      onActionComplete?.();
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const downloadFile = async (file) => {
    const link = document.createElement("a");
    link.href = file.file;
    link.download = file.filename || "DTR.pdf";
    link.click();
  };

  return (
    <AnimatePresence>
      <motion.div
        className="uploader-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="uploader-modal"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
        >
          {/* Header */}
          <div className="modal-header">
            <h2>Uploader Review</h2>
            <button onClick={onClose}>
              <FaTimes />
            </button>
          </div>

          {/* Uploader Info */}
          <div className="uploader-info">
            <strong>{uploader.username}</strong>
            <span>{uploader.email}</span>
          </div>

          {/* Files */}
          <div className="modal-body">
            {loading ? (
              <p className="loading">Loading files…</p>
            ) : files.length === 0 ? (
              <p className="empty">No uploaded DTRs</p>
            ) : (
              <table className="uploader-files-table">
                <thead>
                  <tr>
                    <th>File</th>
                    <th>Period</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file) => (
                    <tr key={file.id}>
                      <td>
                        <FaFilePdf className="pdf-icon" />
                        {file.filename || "DTR File"}
                      </td>
                      <td>
                        {file.from_date} → {file.to_date}
                      </td>
                      <td>
                        <span className={`status ${file.status}`}>
                          {file.status}
                        </span>
                      </td>
                      <td className="actions">
                        <button
                          className="download"
                          onClick={() => downloadFile(file)}
                        >
                          <FaDownload />
                        </button>

                        {file.status !== "verified" && (
                          <button
                            className="approve"
                            onClick={() =>
                              updateStatus(file.id, "verified")
                            }
                          >
                            <FaCheckCircle />
                          </button>
                        )}

                        {file.status !== "rejected" && (
                          <button
                            className="reject"
                            onClick={() =>
                              updateStatus(file.id, "rejected")
                            }
                          >
                            <FaBan />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
