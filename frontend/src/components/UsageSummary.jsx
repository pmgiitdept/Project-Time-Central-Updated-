// components/UsageSummary.jsx
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "../api";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import "./styles/FileTable.css"; // reuse table styles

export default function UsageSummary({ role, currentUser }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Fetch usage summary from backend
  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        toast.error("No authentication token found. Please login again.");
        setLoading(false);
        return;
      }

      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      // ✅ Use the correct backend endpoint
      const res = await api.get("/files/dtr/files/employee/", {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      if (!Array.isArray(res.data)) {
        toast.error("Invalid response format from server.");
        setLoading(false);
        return;
      }

      // Group totals by employee → project/uploader
      const grouped = {};
      res.data.forEach((entry) => {
        const employee = entry.employee_name || entry.employee_no || "Unknown";
        const project = entry.project || "Unknown";

        if (!grouped[employee]) grouped[employee] = {};
        if (!grouped[employee][project]) grouped[employee][project] = 0;

        grouped[employee][project] += entry.total_hours || 0;
      });

      // Transform grouped data to array for table
      const tableData = Object.keys(grouped).map((employee) => {
        const row = { employee };
        Object.keys(grouped[employee]).forEach((project) => {
          row[project] = grouped[employee][project];
        });
        return row;
      });

      setData(tableData);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) {
        toast.error("Unauthorized. Please login again.");
      } else if (err.response?.status === 404) {
        toast.error("Endpoint not found. Check backend URL.");
      } else {
        toast.error("Failed to fetch usage summary.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Excel export
  const handleExport = () => {
    if (!data.length) return toast.warning("No data to export");

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "UsageSummary");

    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    saveAs(new Blob([buf], { type: "application/octet-stream" }), "UsageSummary.xlsx");
  };

  // Re-fetch when date range changes
  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  // Dynamically collect all project keys for table headers
  const allProjects = Array.from(
    new Set(data.flatMap((row) => Object.keys(row).filter((k) => k !== "employee")))
  );

  // Optional: filter by permissions
  const canView = role === "admin" || role === "payroll";

  if (!canView) return <p>You do not have permission to view this summary.</p>;

  return (
    <div className="usage-summary-wrapper">
      {/* 🔹 Filters */}
      <div className="filters" style={{ marginBottom: "1rem" }}>
        <div className="filter-item date-range">
          <label>Date Range:</label>
          <div className="date-inputs">
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

        <button
          className="upload-button"
          style={{ marginLeft: "1rem" }}
          onClick={handleExport}
          disabled={loading || !data.length}
        >
          Export to Excel
        </button>
      </div>

      {/* 🔹 Table */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading usage summary...</p>
        </div>
      ) : (
        <div className="table-scroll-container">
          <table className="file-table">
            <thead>
              <tr>
                <th>Employee</th>
                {allProjects.map((project) => (
                  <th key={project}>{project}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.length ? (
                data.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.employee}</td>
                    {allProjects.map((project) => (
                      <td key={project}>{row[project] || 0}</td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={allProjects.length + 1} style={{ textAlign: "center" }}>
                    No data found for selected date range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
