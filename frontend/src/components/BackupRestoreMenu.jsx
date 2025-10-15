import React, { useState, useRef } from "react";
import { toast } from "react-toastify";
import api from "../api";
import "./styles/BackupRestoreMenu.css"; // you can style it similar to employee directory

export default function BackupRestoreMenu() {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const menuRef = useRef(null);

  // --- BACKUP FUNCTION ---
  const handleBackup = async () => {
    try {
      const res = await api.get("/employees/backup/", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = "employee_directory_backup.xlsx";
      link.click();
      toast.success("Backup downloaded successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Backup failed.");
    }
  };

  // --- RESTORE FUNCTION ---
  const handleRestore = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);
    try {
      const res = await api.post("/employees/restore/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(res.data.detail || "Restore complete!");
    } catch (err) {
      console.error(err);
      toast.error("Restore failed. Please check the file.");
    } finally {
      setUploading(false);
      e.target.value = null; // reset input
    }
  };

  return (
    <div className="employee-button-wrapper" ref={menuRef}>
      <button className="employee-button" onClick={() => setOpen(!open)}>
        Backup & Restore
      </button>

      {open && (
        <div className="employee-directory-floating">
          <h2 className="employee-directory-title">Backup and Restore</h2>

          <div className="employee-upload">
            <button
              className="employee-directory-upload-btn"
              onClick={handleBackup}
            >
              Download Backup
            </button>

            <input
              type="file"
              accept=".xlsx"
              ref={fileInputRef}
              onChange={handleRestore}
              style={{ display: "none" }}
            />

            <button
              className="employee-directory-upload-btn"
              onClick={() => fileInputRef.current.click()}
              disabled={uploading}
            >
              {uploading ? "Restoring..." : "Upload to Restore"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
