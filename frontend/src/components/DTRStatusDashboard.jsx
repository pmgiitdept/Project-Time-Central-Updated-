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

  // 🎯 Apply Filters
  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      const matchesUploader =
        !uploaderFilter ||
        file.uploaded_by?.username
          ?.toLowerCase()
          .includes(uploaderFilter.toLowerCase());

      const matchesStart =
        !startDateFilter ||
        new Date(file.start_date) >= new Date(startDateFilter);

      const matchesEnd =
        !endDateFilter ||
        new Date(file.end_date) <= new Date(endDateFilter);

      const matchesUploaded =
        !uploadedDateFilter ||
        new Date(file.uploaded_at).toDateString() ===
          new Date(uploadedDateFilter).toDateString();

      return (
        matchesUploader &&
        matchesStart &&
        matchesEnd &&
        matchesUploaded
      );
    });
  }, [files, uploaderFilter, startDateFilter, endDateFilter, uploadedDateFilter]);

  // 🔹 Split by Status
  const verifiedFiles = filteredFiles.filter(f => f.status === "verified");
  const pendingFiles = filteredFiles.filter(f => f.status === "pending");
  const rejectedFiles = filteredFiles.filter(f => f.status === "rejected");

  return (
    <div className="status-dashboard">
      <h2>DTR File Status Dashboard</h2>

      {/* FILTER SECTION */}
      <div className="filter-bar">
        <input
          type="text"
          placeholder="Filter by uploader..."
          value={uploaderFilter}
          onChange={(e) => setUploaderFilter(e.target.value)}
        />

        <input
          type="date"
          value={startDateFilter}
          onChange={(e) => setStartDateFilter(e.target.value)}
        />

        <input
          type="date"
          value={endDateFilter}
          onChange={(e) => setEndDateFilter(e.target.value)}
        />

        <input
          type="date"
          value={uploadedDateFilter}
          onChange={(e) => setUploadedDateFilter(e.target.value)}
        />
      </div>

      {/* THREE COLUMNS */}
      <div className="status-columns">
        <DTRStatusTable title="Verified" files={verifiedFiles} />
        <DTRStatusTable title="Pending" files={pendingFiles} />
        <DTRStatusTable title="Rejected" files={rejectedFiles} />
      </div>
    </div>
  );
}
