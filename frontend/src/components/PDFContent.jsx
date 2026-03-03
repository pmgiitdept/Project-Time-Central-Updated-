// components/PDFContent.jsx
import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import api from "../api";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import "./styles/FileContent.css"; // reuse styling for consistency

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

export default function PDFContent({ fileId, role }) {
  const [fileInfo, setFileInfo] = useState(null);
  const [fileUrl, setFileUrl] = useState("");
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const isEditable = role === "admin"; // if you plan on adding admin actions later

  const fetchFileInfo = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const metaRes = await api.get(`/files/dtr/files/${fileId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFileInfo(metaRes.data);
      setFileUrl(metaRes.data.file); // full file URL
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch file info");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (fileId) fetchFileInfo();
  }, [fileId]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setCurrentPage(1);
  };

  const goToPrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const goToNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, numPages));

  const handlePrint = () => {
    if (!fileUrl) return;
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = fileUrl;
    document.body.appendChild(iframe);
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading PDF...</p>
      </div>
    );
  }

  if (!fileUrl) {
    return (
      <motion.div
        className="file-content-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        <p>No PDF found.</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="file-content-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      {/* Metadata */}
      <div className="file-content-left file-metadata">
        <div className="metadata-grid">
          <div>
            <strong>Owner:</strong> <span>{fileInfo?.owner || "-"}</span>
          </div>
          <div>
            <strong>File Name:</strong>{" "}
            <span>{fileInfo?.file?.split("/").pop() || "-"}</span>
          </div>
          <div>
            <strong>Uploaded At:</strong>{" "}
            <span>
              {fileInfo?.uploaded_at
                ? new Date(fileInfo.uploaded_at).toLocaleString()
                : "-"}
            </span>
          </div>
          <div>
            <strong>Status:</strong>{" "}
            <span className={`status-span ${fileInfo?.status?.toLowerCase() || "pending"}`}>
              {fileInfo?.status || "pending"}
            </span>
          </div>
        </div>

        {/* Toolbar */}
        <div className="modal-toolbar" style={{ marginTop: "1rem" }}>
          <button onClick={goToPrevPage} disabled={currentPage <= 1}>
            ◀ Previous
          </button>
          <span style={{ margin: "0 0.5rem" }}>
            Page {currentPage} / {numPages || 1}
          </span>
          <button onClick={goToNextPage} disabled={currentPage >= numPages}>
            Next ▶
          </button>
          <button onClick={handlePrint} style={{ marginLeft: "1rem" }}>
            🖨 Print PDF
          </button>
        </div>
      </div>

      {/* PDF Viewer */}
      <div
        style={{
          marginTop: "1rem",
          overflowY: "auto",
          maxHeight: "80vh",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Document file={fileUrl} onLoadSuccess={onDocumentLoadSuccess}>
          <Page pageNumber={currentPage} width={800} />
        </Document>
      </div>
    </motion.div>
  );
}