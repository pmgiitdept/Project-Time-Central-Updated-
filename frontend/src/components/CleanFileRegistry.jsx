import { useEffect, useState } from "react";
import api from "../api";
import { toast } from "react-toastify";
import "./styles/CleanFileRegistry.css";

export default function CleanFileRegistry({ role, files = [] }) {
  const [loading, setLoading] = useState(false);

  const [searchUploader, setSearchUploader] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [uploadedStart, setUploadedStart] = useState("");
  const [uploadedEnd, setUploadedEnd] = useState("");
  const [coveredStart, setCoveredStart] = useState("");
  const [coveredEnd, setCoveredEnd] = useState("");

  const filteredFiles = files.filter(file => {
    const uploader = file.uploaded_by?.username?.toLowerCase() || "";
    const matchesUploader = uploader.includes(searchUploader.toLowerCase());

    const matchesStatus = statusFilter ? file.status === statusFilter : true;

    const uploadedDate = new Date(file.uploaded_at).setHours(0,0,0,0);
    const matchesUploadedStart = uploadedStart
      ? uploadedDate >= new Date(uploadedStart).setHours(0,0,0,0)
      : true;
    const matchesUploadedEnd = uploadedEnd
      ? uploadedDate <= new Date(uploadedEnd).setHours(0,0,0,0)
      : true;

    const coveredStartDate = file.start_date
      ? new Date(file.start_date).setHours(0,0,0,0)
      : null;
    const coveredEndDate = file.end_date
      ? new Date(file.end_date).setHours(0,0,0,0)
      : null;

    const matchesCoveredStart = coveredStart
      ? coveredStartDate && coveredStartDate >= new Date(coveredStart).setHours(0,0,0,0)
      : true;

    const matchesCoveredEnd = coveredEnd
      ? coveredEndDate && coveredEndDate <= new Date(coveredEnd).setHours(0,0,0,0)
      : true;

    return (
      matchesUploader &&
      matchesStatus &&
      matchesUploadedStart &&
      matchesUploadedEnd &&
      matchesCoveredStart &&
      matchesCoveredEnd
    );
  });

  if (loading) {
    return <div className="loading-container">Loading files...</div>;
  }

  return (
    <div className="clean-registry-wrapper">
      <h2 className="registry-title">Uploaded Files Registry</h2>

      {/* Filters */}
      <div className="registry-filters">
        <input
          type="text"
          placeholder="Search by uploader..."
          value={searchUploader}
          onChange={(e) => setSearchUploader(e.target.value)}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>

        <div>
          <label>Uploaded:</label>
          <input type="date" value={uploadedStart} onChange={(e) => setUploadedStart(e.target.value)} />
          <input type="date" value={uploadedEnd} onChange={(e) => setUploadedEnd(e.target.value)} />
        </div>

        <div>
          <label>Covered:</label>
          <input type="date" value={coveredStart} onChange={(e) => setCoveredStart(e.target.value)} />
          <input type="date" value={coveredEnd} onChange={(e) => setCoveredEnd(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <div className="registry-table-container">
        <table className="registry-table">
          <thead>
            <tr>
              <th>Uploader</th>
              <th>Uploaded At</th>
              <th>Status</th>
              <th>Covered Start</th>
              <th>Covered End</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            {filteredFiles.map(file => (
              <tr key={file.id}>
                <td>{file.uploaded_by?.username || "N/A"}</td>
                <td>{new Date(file.uploaded_at).toLocaleString()}</td>
                <td>
                  <span className={`status-badge status-${file.status}`}>
                    {file.status}
                  </span>
                </td>
                <td>{file.start_date || "-"}</td>
                <td>{file.end_date || "-"}</td>
                <td>{file.file ? "PDF Upload" : "Manual DTR"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
