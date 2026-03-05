import { FaSyncAlt } from "react-icons/fa";
import { useEffect, useState, useRef } from "react";
import api from "../api";
import DTRTable from "./DTRTable";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import "./styles/FileTableVertical.css";

// Modal for rejection reason
function RejectionModal({ isOpen, onClose, onSubmit }) {
  const [reason, setReason] = useState("");

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h4>Enter Rejection Reason</h4>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for rejecting this file"
        />
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-submit" onClick={() => onSubmit(reason)}>Submit</button>
        </div>
      </div>
    </div>
  );
}

export default function FileTableVertical({ role, uploaderFilter = null }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [uploaderFilterLocal, setUploaderFilterLocal] = useState("");
  const [uploadStartDate, setUploadStartDate] = useState("");
  const [uploadEndDate, setUploadEndDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [currentRejectFile, setCurrentRejectFile] = useState(null);

  const hasFetchedRef = useRef(false);

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

  const handleStatusChange = (fileId, newStatus) => {
    if (newStatus === "rejected") {
      const file = files.find(f => f.id === fileId);
      setCurrentRejectFile(file);
      setRejectionModalOpen(true);
    } else {
      updateStatus(fileId, newStatus);
    }
  };

  const updateStatus = async (fileId, newStatus, reason = "") => {
    const token = localStorage.getItem("access_token");
    try {
      await api.patch(
        `/files/dtr/files/${fileId}/status/`,
        { status: newStatus, rejection_reason: reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFiles(prev => prev.map(file => file.id === fileId ? { ...file, status: newStatus, rejection_reason: reason } : file));
      toast.success(`Status updated to ${newStatus}`);
    } catch {
      toast.error("Failed to update status");
    } finally {
      setRejectionModalOpen(false);
      setCurrentRejectFile(null);
    }
  };

  const handleRejectionSubmit = (reason) => {
    if (currentRejectFile) {
      updateStatus(currentRejectFile.id, "rejected", reason);
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
    <motion.div className="file-vertical-wrapper" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      
      {/* TOP SECTION */}
      <div className="file-vertical-top">
        <div className="vertical-header">
          <h3>Summary Forms Dashboard</h3>
          <button className="refresh-btn" onClick={fetchFiles}><FaSyncAlt /></button>
        </div>

        {/* FILTERS WITH LABELS */}
        <div className="vertical-filters">
          <label>
            Search: <input type="text" placeholder="Uploader or filename" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <label>
            Uploader: 
            <select value={uploaderFilterLocal} onChange={(e) => setUploaderFilterLocal(e.target.value)}>
              <option value="">All</option>
              {uniqueUploaders.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </label>
          <label>
            Status: 
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
          <label>
            Upload Start: <input type="date" value={uploadStartDate} onChange={(e)=>setUploadStartDate(e.target.value)} />
          </label>
          <label>
            Upload End: <input type="date" value={uploadEndDate} onChange={(e)=>setUploadEndDate(e.target.value)} />
          </label>
          <label>
            Start Covered: <input type="date" value={startDate} onChange={(e)=>setStartDate(e.target.value)} />
          </label>
          <label>
            End Covered: <input type="date" value={endDate} onChange={(e)=>setEndDate(e.target.value)} />
          </label>
        </div>

        {/* TABLE */}
        <div className="vertical-table-container">
          <table className="vertical-file-table">
            <thead>
              <tr>
                <th>Uploader</th>
                <th>Uploaded</th>
                <th>Status</th>
                <th>Rejection Reason</th>
                <th>Start</th>
                <th>End</th>
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
                  <td>{file.rejection_reason || "-"}</td>
                  <td>{file.start_date ? new Date(file.start_date).toLocaleDateString() : "-"}</td>
                  <td>{file.end_date ? new Date(file.end_date).toLocaleDateString() : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* REJECTION MODAL */}
      <RejectionModal
        isOpen={rejectionModalOpen}
        onClose={() => setRejectionModalOpen(false)}
        onSubmit={handleRejectionSubmit}
      />

      {/* BOTTOM DTR TABLE */}
      <div className="file-vertical-bottom">
        <DTRTable role={role} fileId={selectedFileId} />
      </div>

    </motion.div>
  );
}