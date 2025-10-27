/* components/FileTable.jsx */
import { FaSyncAlt } from "react-icons/fa";
import { useEffect, useState } from "react";
import api from "../api";
import DTRTable from "../components/DTRTable";
import { toast } from "react-toastify";
import FileContent from "./FileContent";
import "./styles/FileTable.css";
import { motion } from "framer-motion";

export default function FileTable({ role, setSelectedFile }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState({});
  const [deleting, setDeleting] = useState({});
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [highlightedFiles, setHighlightedFiles] = useState([]);
  const [deleteModal, setDeleteModal] = useState({ open: false, fileIds: [], message: "" });
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [notifiedFiles, setNotifiedFiles] = useState([]);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async (url = "/files/dtr/files/") => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await api.get(url, { headers: { Authorization: `Bearer ${token}` } });
      const fileList = res.data.results || res.data;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const newTodayFiles = fileList.filter(file => {
        const fileDate = new Date(file.uploaded_at);
        fileDate.setHours(0, 0, 0, 0);
        return fileDate.getTime() === today.getTime();
      });

      const unnotifiedFiles = newTodayFiles.filter(f => !notifiedFiles.includes(f.id));
      const unnotifiedFileIds = unnotifiedFiles.map(f => f.id);

      setHighlightedFiles(newTodayFiles.map(f => f.id));
      setFiles(fileList);

      if (unnotifiedFileIds.length) {
        const fileNames = unnotifiedFiles.map(f => f.file.split("/").pop()).join(", ");
        toast.success(`${unnotifiedFileIds.length} new DTR file(s) uploaded today: ${fileNames}`);
        setNotifiedFiles(prev => [...prev, ...unnotifiedFileIds]);
        setTimeout(() => setHighlightedFiles([]), 3000);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch DTR files");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (fileId, newStatus) => {
    try {
      const token = localStorage.getItem("access_token");
      await api.patch(
        `/files/dtr/files/${fileId}/`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFiles(prev =>
        prev.map(file =>
          file.id === fileId ? { ...file, status: newStatus } : file
        )
      );
      toast.success(`Status updated to ${newStatus}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    }
  };

  const getFilteredFiles = () => {
    return files.filter((file) => {
      const name = (file.file?.split("/").pop() || "").toLowerCase();
      const owner = (file.uploaded_by?.username || "").toLowerCase();
      const query = search.toLowerCase();
      const matchesSearch = name.includes(query) || owner.includes(query);

      const fileDate = new Date(file.uploaded_at).setHours(0,0,0,0);
      const matchesStartDate = startDate ? fileDate >= new Date(startDate).setHours(0,0,0,0) : true;
      const matchesEndDate = endDate ? fileDate <= new Date(endDate).setHours(0,0,0,0) : true;

      return matchesSearch && matchesStartDate && matchesEndDate;
    });
  };

  const handleDownload = async (fileId, fileName) => {
    setDownloadLoading((prev) => ({ ...prev, [fileId]: true }));
    try {
      const token = localStorage.getItem("access_token");
      const res = await api.get(`/files/dtr/files/${fileId}/download/`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      toast.success(`Downloaded ${fileName}`);
    } catch (err) {
      console.error(err);
      toast.error("Download failed or no permission");
    } finally {
      setDownloadLoading((prev) => ({ ...prev, [fileId]: false }));
    }
  };

  const handleDeleteClick = (fileId) => {
    setDeleteModal({
      open: true,
      fileIds: [fileId],
      message: "Are you sure you want to delete this DTR file?",
    });
  };

  const handleDeleteSelectedClick = () => {
    setDeleteModal({
      open: true,
      fileIds: [...selectedFiles],
      message: `Are you sure you want to delete ${selectedFiles.length} DTR file(s)?`,
    });
  };

  const confirmDelete = async () => {
    const fileIds = deleteModal.fileIds;
    const token = localStorage.getItem("access_token");

    try {
      const newDeleting = {};
      fileIds.forEach(id => newDeleting[id] = true);
      setDeleting(prev => ({ ...prev, ...newDeleting }));

      await Promise.all(
        fileIds.map((fileId) =>
          api.delete(`/files/dtr/files/${fileId}/`, { headers: { Authorization: `Bearer ${token}` } })
        )
      );

      setFiles(prevFiles => prevFiles.filter(file => !fileIds.includes(file.id)));
      setSelectedFiles(prev => prev.filter(id => !fileIds.includes(id)));
      toast.success(`${fileIds.length} DTR file(s) deleted successfully`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete some DTR files");
    } finally {
      const newDeleting = {};
      fileIds.forEach(id => newDeleting[id] = false);
      setDeleting(prev => ({ ...prev, ...newDeleting }));
      setDeleteModal({ open: false, fileIds: [], message: "" });
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading DTR files...</p>
      </div>
    );
  }

  const filteredFiles = getFilteredFiles();

  return (
    <>
      {/* Delete Modal */}
      {deleteModal.open && (
        <div
          className="modal-overlay5"
          onClick={() => setDeleteModal({ open: false, fileIds: [], message: "" })}
        >
          <div className="modal-wrapper5" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm Delete</h3>
            <p>{deleteModal.message}</p>
            <div className="modal-actions">
              <button
                onClick={() => setDeleteModal({ open: false, fileIds: [], message: "" })}
              >
                Cancel
              </button>
              <button onClick={confirmDelete} className="action-btn delete">
                {deleteModal.fileIds.some(id => deleting[id]) ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <motion.div
        className="file-table-wrapper"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        <div className="file-table-left">
          <div className="table-header">
            <h2 className="table-section-title">Summary Forms Dashboard</h2>
            <button
              className="refresh-btn"
              onClick={() => fetchFiles()}
              disabled={loading}
              title="Refresh"
            >
              <FaSyncAlt className={loading ? "spin" : ""} />
            </button>
          </div>

          <div className="filters">
            <div className="filter-item">
              <label>Search:</label>
              <input
                type="text"
                placeholder="File name or uploader"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="filter-item date-range">
              <label>Date Range:</label>
              <div className="date-inputs">
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                <span className="date-separator">to</span>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          </div>

          {selectedFiles.length > 0 && role === "admin" && (
            <div style={{ marginBottom: "1rem" }}>
              <button
                className="action-btn delete"
                onClick={handleDeleteSelectedClick}
              >
                Delete Selected
              </button>
            </div>
          )}

         {/* Tables by Status */}
          {["verified", "pending", "rejected"].map((status) => {
            const filtered = getFilteredFiles().filter(f => f.status === status);
            if (filtered.length === 0) return null;

            return (
              <div key={status} className="status-table-section">
                <h3 className="status-header">
                  {status.charAt(0).toUpperCase() + status.slice(1)} Files ({filtered.length})
                </h3>

                <div className="table-scroll-container">
                  <table className="file-table">
                    <thead>
                      <tr>
                        {role === "admin" && <th></th>}
                        <th>Uploader</th>
                        <th>Uploaded At</th>
                        <th>Status</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                        {(role === "admin" || role === "viewer") && <th>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(file => (
                        <tr
                          key={file.id}
                          className={`clickable-row ${selectedFileId === file.id ? "selected" : ""} ${highlightedFiles.includes(file.id) ? "highlighted" : ""}`}
                          onClick={(e) => {
                            if (e.target.tagName === "INPUT" || e.target.closest(".action-btn")) return;
                            setSelectedFileId(file.id);
                          }}
                        >
                          {role === "admin" && (
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedFiles.includes(file.id)}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedFiles([...selectedFiles, file.id]);
                                  else setSelectedFiles(selectedFiles.filter(id => id !== file.id));
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </td>
                          )}
                          <td>{file.uploaded_by?.username || "N/A"}</td>
                          <td>{new Date(file.uploaded_at).toLocaleString()}</td>
                          <td>
                            {(role === "admin" || role === "viewer") ? (
                              <select
                                value={file.status}
                                onChange={(e) => handleStatusChange(file.id, e.target.value)}
                                className={`status-select ${file.status}`}
                              >
                                <option value="pending">Pending</option>
                                <option value="verified">Verified</option>
                                <option value="rejected">Rejected</option>
                              </select>
                            ) : (
                              <span className={`status-badge status-${file.status}`}>
                                {file.status}
                              </span>
                            )}
                          </td>
                          <td>{file.start_date ? new Date(file.start_date).toLocaleDateString() : "-"}</td>
                          <td>{file.end_date ? new Date(file.end_date).toLocaleDateString() : "-"}</td>

                          {(role === "admin" || role === "viewer") && (
                            <td>
                              <button
                                className="action-btn download"
                                onClick={(e) => { e.stopPropagation(); handleDownload(file.id, file.file.split("/").pop()); }}
                                disabled={downloadLoading[file.id]}
                              >
                                {downloadLoading[file.id] ? "Downloading..." : "Download"}
                              </button>
                              <button
                                className="action-btn delete"
                                onClick={(e) => { e.stopPropagation(); handleDeleteClick(file.id); }}
                                disabled={deleting[file.id]}
                              >
                                {deleting[file.id] ? "Deleting..." : "Delete"}
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
          <div className="file-content-right"> 
           <DTRTable role={role} fileId={selectedFileId} />
          </div>
      </motion.div>
    </>
  );
}