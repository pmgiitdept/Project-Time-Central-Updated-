import { FaSyncAlt } from "react-icons/fa";
import { useEffect, useState, useRef } from "react";
import api from "../api";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import "./styles/FileTableVertical.css";
import DTRTableCompact from "./DTRTableCompact";

export default function FileTableVertical({ role, uploaderFilter = null }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [downloadLoading, setDownloadLoading] = useState({});
  const [deleting, setDeleting] = useState({});
  const [deleteModal, setDeleteModal] = useState({ open: false, fileIds: [], message: "" });
  const [viewingReason, setViewingReason] = useState(null);

  const [rejectingFileId, setRejectingFileId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [uploaderFilterLocal, setUploaderFilterLocal] = useState(uploaderFilter || "");
  const [uploadStartDate, setUploadStartDate] = useState("");
  const [uploadEndDate, setUploadEndDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const hasFetchedRef = useRef(false);

  useEffect(() => {
    setUploaderFilterLocal(uploaderFilter || "");
    setSearch("");
    setStatusFilter("");
    setUploadStartDate("");
    setUploadEndDate("");
    setStartDate("");
    setEndDate("");
  }, [uploaderFilter]);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchFiles();
  }, []);

  const fetchFiles = async (url = "/files/dtr/files/") => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await api.get(url, { headers: { Authorization: `Bearer ${token}` } });
      setFiles(res.data.results || res.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch files");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (fileId, newStatus) => {
    if (newStatus === "rejected") {
      setRejectingFileId(fileId);
      return;
    }

    const token = localStorage.getItem("access_token");
    try {
      await api.patch(
        `/files/dtr/files/${fileId}/status/`,
        { status: newStatus, rejection_reason: null },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setFiles(prev =>
        prev.map(file =>
          file.id === fileId ? { ...file, status: newStatus, rejection_reason: null } : file
        )
      );

      toast.success(`Status updated to ${newStatus}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDownload = async (fileId, fileName, fileUrl) => {
    if (fileUrl && fileUrl.endsWith(".pdf")) {
      window.open(fileUrl, "_blank");
      return;
    }

    setDownloadLoading((prev) => ({ ...prev, [fileId]: true }));
    try {
      const token = localStorage.getItem("access_token");
      const res = await api.get(`/files/dtr/files/${fileId}/export/`, {
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
      toast.success(`${fileIds.length} DTR file(s) deleted successfully`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete DTR file(s)");
    } finally {
      const newDeleting = {};
      fileIds.forEach(id => newDeleting[id] = false);
      setDeleting(prev => ({ ...prev, ...newDeleting }));
      setDeleteModal({ open: false, fileIds: [], message: "" });
    }
  };

  const getFilteredFiles = () => {
    return files.filter((file) => {
      const name = (file.file?.split("/").pop() || "").toLowerCase();
      const owner = (file.uploaded_by?.username || "").toLowerCase();
      const query = search.toLowerCase();

      const fileDate = new Date(file.uploaded_at).setHours(0,0,0,0);
      const startCovered = file.start_date ? new Date(file.start_date).setHours(0,0,0,0) : null;
      const endCovered = file.end_date ? new Date(file.end_date).setHours(0,0,0,0) : null;

      const matchesSearch = name.includes(query) || owner.includes(query);
      const matchesUploader = uploaderFilterLocal ? owner === uploaderFilterLocal.toLowerCase() : true;
      const matchesStatus = statusFilter ? file.status === statusFilter : true;
      const matchesUploadStart = uploadStartDate ? fileDate >= new Date(uploadStartDate).setHours(0,0,0,0) : true;
      const matchesUploadEnd = uploadEndDate ? fileDate <= new Date(uploadEndDate).setHours(0,0,0,0) : true;
      const matchesStartDate = startDate ? startCovered >= new Date(startDate).setHours(0,0,0,0) : true;
      const matchesEndDate = endDate ? endCovered <= new Date(endDate).setHours(0,0,0,0) : true;

      return matchesSearch && matchesUploader && matchesStatus &&
             matchesUploadStart && matchesUploadEnd && matchesStartDate && matchesEndDate;
    });
  };

  if (loading) return <p>Loading files...</p>;

  const filteredFiles = getFilteredFiles();
  const uniqueUploaders = [...new Set(files.map(f => f.uploaded_by?.username).filter(Boolean))];

  return (
    <>
      {deleteModal.open && (
        <div className="modal-overlay5" onClick={() => setDeleteModal({ open: false, fileIds: [], message: "" })}>
          <div className="modal-wrapper5" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm Delete</h3>
            <p>{deleteModal.message}</p>
            <div className="modal-actions">
              <button onClick={() => setDeleteModal({ open: false, fileIds: [], message: "" })}>Cancel</button>
              <button onClick={confirmDelete} className="action-btn delete">
                {deleteModal.fileIds.some(id => deleting[id]) ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectingFileId && (
        <div className="modal-overlay5" onClick={() => setRejectingFileId(null)}>
          <div className="modal-wrapper5" onClick={e => e.stopPropagation()}>
            <h3>Reject DTR File</h3>
            <textarea
              placeholder="Enter reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              style={{ width: "100%", marginBottom: "1rem" }}
            />
            <div className="modal-actions">
              <button onClick={() => setRejectingFileId(null)}>Cancel</button>
              <button
                className="action-btn delete"
                onClick={async () => {
                  try {
                    const token = localStorage.getItem("access_token");
                    await api.patch(
                      `/files/dtr/files/${rejectingFileId}/status/`,
                      { status: "rejected", rejection_reason: rejectionReason },
                      { headers: { Authorization: `Bearer ${token}` } }
                    );

                    setFiles(prev =>
                      prev.map(file =>
                        file.id === rejectingFileId
                          ? { ...file, status: "rejected", rejection_reason: rejectionReason }
                          : file
                      )
                    );

                    toast.success("File rejected");
                  } catch {
                    toast.error("Failed to reject file");
                  } finally {
                    setRejectingFileId(null);
                    setRejectionReason("");
                  }
                }}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingReason && (
        <div className="modal-overlay5" onClick={() => setViewingReason(null)}>
          <div className="modal-wrapper5" onClick={(e) => e.stopPropagation()}>
            <h3>Rejection Reason</h3>
            <div className="rejection-card">
              <p>{viewingReason.rejection_reason}</p>
            </div>
            <div className="modal-actions">
              <button onClick={() => setViewingReason(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <motion.div className="file-vertical-wrapper" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

        {/* TOP SECTION */}
        <div className="file-vertical-top">
          <div className="vertical-header">
            <h3>Summary Forms Dashboard</h3>
            <button className="refresh-btn" onClick={fetchFiles}><FaSyncAlt /></button>
          </div>

          {/* FILTERS */}
          <div className="vertical-filters">
            {/* Search */}
            <div className="filter-item">
              <label>Search</label>
              <input
                type="text"
                placeholder="Uploader or filename"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Uploader */}
            <div className="filter-item">
              <label>Uploader</label>
              <select
                value={uploaderFilterLocal}
                onChange={(e) => setUploaderFilterLocal(e.target.value)}
              >
                <option value="">All Uploaders</option>
                {uniqueUploaders.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="filter-item">
              <label>Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Upload Start Date */}
            <div className="filter-item">
              <label>Upload From</label>
              <input
                type="date"
                value={uploadStartDate}
                onChange={(e) => setUploadStartDate(e.target.value)}
              />
            </div>

            {/* Covered Date Range */}
            <div className="filter-item">
              <label>Covered Dates</label>
              <div className="date-range-inputs">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <span className="date-separator">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* TABLE */}
          <div className="vertical-table-container">
            <table className="vertical-file-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Date Upload</th>
                  <th>Status</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Rejection Reason</th>
                  {(role === "admin" || role === "viewer") && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredFiles.map(file => (
                  <tr key={file.id} className={selectedFileId === file.id ? "selected-row" : ""} onClick={() => setSelectedFileId(file.id)}>
                    <td>{file.uploaded_by?.username || "N/A"}</td>
                    <td>{new Date(file.uploaded_at).toLocaleString()}</td>
                    <td>
                      {(role === "admin" || role === "viewer") ? (
                        <select value={file.status} onChange={(e) => handleStatusChange(file.id, e.target.value)} className={`status-select ${file.status}`}>
                          <option value="pending">Pending</option>
                          <option value="verified">Verified</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      ) : (
                        <span className={`status-badge status-${file.status}`}>{file.status}</span>
                      )}
                    </td>
                    <td>{file.start_date ? new Date(file.start_date).toLocaleDateString() : "-"}</td>
                    <td>{file.end_date ? new Date(file.end_date).toLocaleDateString() : "-"}</td>
                    
                    <td>
                      {file.status === "rejected" && file.rejection_reason ? (
                        <span
                          className="rejection-ellipsis"
                          onClick={(e) => { e.stopPropagation(); setViewingReason(file); }}
                          title="Click to view full reason"
                        >
                          {file.rejection_reason.length > 20
                            ? file.rejection_reason.substring(0, 20) + "..."
                            : file.rejection_reason
                          }
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>

                    {(role === "admin" || role === "viewer") && (
                      <td>
                        <button className="action-btn download" onClick={(e) => { e.stopPropagation(); handleDownload(file.id, `DTR_${file.id}.xlsx`, file.file); }} disabled={downloadLoading[file.id]}>
                          {downloadLoading[file.id] ? "Downloading..." : "Download"}
                        </button>
                        <button className="action-btn delete" onClick={(e) => { e.stopPropagation(); handleDeleteClick(file.id); }} disabled={deleting[file.id]}>
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

        {/* BOTTOM SECTION (DTR Table) */}
        <div className="file-vertical-bottom">
          <DTRTableCompact role={role} fileId={selectedFileId} />
        </div>

      </motion.div>
    </>
  );
}