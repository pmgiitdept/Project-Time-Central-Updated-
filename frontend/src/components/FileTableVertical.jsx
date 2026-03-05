import { FaSyncAlt } from "react-icons/fa";
import { useEffect, useState, useRef } from "react";
import api from "../api";
import DTRTable from "./DTRTable";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import "./styles/FileTableVertical.css";

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

  const handleStatusChange = async (fileId, newStatus) => {
    const token = localStorage.getItem("access_token");
    try {
      await api.patch(
        `/files/dtr/files/${fileId}/status/`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFiles((prev) =>
        prev.map((file) =>
          file.id === fileId ? { ...file, status: newStatus } : file
        )
      );
      toast.success(`Status updated to ${newStatus}`);
    } catch {
      toast.error("Failed to update status");
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

        {/* FILTERS */}
        <div className="vertical-filters">
          <input type="text" placeholder="Search uploader or filename" value={search} onChange={(e) => setSearch(e.target.value)} />
          
          <select value={uploaderFilterLocal} onChange={(e) => setUploaderFilterLocal(e.target.value)}>
            <option value="">All Uploaders</option>
            {uniqueUploaders.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>

          <input type="date" value={uploadStartDate} onChange={(e)=>setUploadStartDate(e.target.value)} placeholder="Upload Start" />
          <input type="date" value={uploadEndDate} onChange={(e)=>setUploadEndDate(e.target.value)} placeholder="Upload End" />
          <input type="date" value={startDate} onChange={(e)=>setStartDate(e.target.value)} placeholder="Start Covered" />
          <input type="date" value={endDate} onChange={(e)=>setEndDate(e.target.value)} placeholder="End Covered" />
        </div>

        {/* TABLE */}
        <div className="vertical-table-container">
          <table className="vertical-file-table">
            <thead>
              <tr>
                <th>Uploader</th>
                <th>Uploaded</th>
                <th>Status</th>
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
                  <td>{file.start_date ? new Date(file.start_date).toLocaleDateString() : "-"}</td>
                  <td>{file.end_date ? new Date(file.end_date).toLocaleDateString() : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* BOTTOM SECTION (DTR Table) */}
      <div className="file-vertical-bottom">
        <DTRTable role={role} fileId={selectedFileId} />
      </div>

    </motion.div>
  );
}