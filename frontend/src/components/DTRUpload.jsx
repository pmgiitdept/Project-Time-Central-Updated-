// components/DTRUpload.jsx
import { useState, useRef } from "react";
import api from "../api";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import "./styles/ClientDashboard.css";

export default function DTRUpload({ refreshDTR }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null); // Ref to reset input

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return toast.error("Select an Excel file first.");
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      return toast.error("Please upload a valid Excel file (.xlsx, .xls, .csv)");
    }

    setUploading(true);
    const token = localStorage.getItem("access_token");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("/files/dtr/files/", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const fileId = res.data.id;

      try {
        await api.post(`/files/dtr/files/${fileId}/parse/`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("DTR file uploaded and parsed successfully!");
      } catch (parseErr) {
        console.error(parseErr);
        toast.error("Upload succeeded, but parsing failed.");
      }

      // Reset file input and state
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = null;

      refreshDTR();
    } catch (err) {
      console.error(err);
      toast.error("DTR upload failed.");
    } finally {
      setUploading(false); // Re-enable button
    }
  };

  return (
    <motion.div
      className="upload-card1"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      <h2 className="upload-title">Upload Summary Form</h2>
      <form onSubmit={handleUpload} className="upload-form1">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => setFile(e.target.files[0])}
          className="file-input"
        />
        <button
          type="submit"
          disabled={uploading}
          className="upload-button"
        >
          {uploading ? "Uploading..." : "Upload DTR"}
        </button>
      </form>
      {file && <p className="selected-file">📊 {file.name}</p>}
    </motion.div>
  );
}
