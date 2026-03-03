// components/DTRStatusDashboard.jsx
import { useEffect, useState, useMemo } from "react";
import api from "../api";
import DTRStatusTable from "./DTRStatusTable";
import "./styles/DTRStatusDashboard.css";

export default function DTRStatusDashboard() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [uploaderFilter, setUploaderFilter] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [uploadedDateFilter, setUploadedDateFilter] = useState("");

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const res = await api.get("/files/dtr/files/");
      setFiles(res.data.results || res.data);
    } catch (err) {
      console.error("Failed to fetch files", err);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 Normalize status safely
  const normalizeStatus = (status) =>
    (status || "").toString().toLowerCase().trim();

  // 🎯 Apply Filters (safe version)
  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      const matchesUploader =
        !uploaderFilter ||
        file.uploaded_by?.username
          ?.toLowerCase()
          .includes(uploaderFilter.toLowerCase());

      const matchesStart =
        !startDateFilter ||
        (file.start_date &&
          new Date(file.start_date) >= new Date(startDateFilter));

      const matchesEnd =
        !endDateFilter ||
        (file.end_date &&
          new Date(file.end_date) <= new Date(endDateFilter));

      const matchesUploaded =
        !uploadedDateFilter ||
        (file.uploaded_at &&
          new Date(file.uploaded_at).toDateString() ===
            new Date(uploadedDateFilter).toDateString());

      return (
        matchesUploader &&
        matchesStart &&
        matchesEnd &&
        matchesUploaded
      );
    });
  }, [files, uploaderFilter, startDateFilter, endDateFilter, uploadedDateFilter]);

  // 🔹 Split by Status (SAFE VERSION)
  const verifiedFiles = filteredFiles.filter(
    (f) => normalizeStatus(f.status) === "verified"
  );

  const pendingFiles = filteredFiles.filter(
    (f) => normalizeStatus(f.status) === "pending"
  );

  const rejectedFiles = filteredFiles.filter(
    (f) => normalizeStatus(f.status) === "rejected"
  );

  // 🔎 Catch any unexpected statuses (prevents silent disappearing)
  const otherFiles = filteredFiles.filter(
    (f) =>
      !["verified", "pending", "rejected"].includes(
        normalizeStatus(f.status)
      )
  );

  return (
    <div className="status-dashboard">
      <h2>DTR File Status Dashboard</h2>
      <p>
        Overall records of files uploaded, categorized by their verification
        status. Use the filters to narrow down results.
      </p>

      {/* FILTER SECTION */}
      <div className="filter-bar">
        <div className="filter-group">
          <label>Uploader</label>
          <input
            type="text"
            placeholder="Search uploader..."
            value={uploaderFilter}
            onChange={(e) => setUploaderFilter(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>Start Date From</label>
          <input
            type="date"
            value={startDateFilter}
            onChange={(e) => setStartDateFilter(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>End Date Until</label>
          <input
            type="date"
            value={endDateFilter}
            onChange={(e) => setEndDateFilter(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>Date Uploaded</label>
          <input
            type="date"
            value={uploadedDateFilter}
            onChange={(e) => setUploadedDateFilter(e.target.value)}
          />
        </div>
      </div>

      {/* THREE + FALLBACK COLUMN */}
      <div className="status-columns">
        <DTRStatusTable title="Verified" files={verifiedFiles} />
        <DTRStatusTable title="Pending" files={pendingFiles} />
        <DTRStatusTable title="Rejected" files={rejectedFiles} />
        {otherFiles.length > 0 && (
          <DTRStatusTable title="Other" files={otherFiles} />
        )}
      </div>
    </div>
  );
}