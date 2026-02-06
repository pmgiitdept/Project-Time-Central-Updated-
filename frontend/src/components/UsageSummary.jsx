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

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const res = await api.get("/dtr/by-employee/", {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      // Group totals by employee → project/uploader
      const grouped = {};
      res.data.forEach((entry) => {
        const employee = entry.employee_name || entry.employee_no;
        const project = entry.project || "Unknown";

        if (!grouped[employee]) grouped[employee] = {};
        if (!grouped[employee][project]) grouped[employee][project] = 0;

        grouped[employee][project] += entry.total_hours || 0; // or any numeric value
      });

      // Transform for table
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
      toast.error("Failed to fetch usage summary");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!data.length) return toast.warning("No data to export");

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "UsageSummary");

    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    saveAs(new Blob([buf], { type: "application/octet-stream" }), "UsageSummary.xlsx");
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  // Collect all project keys dynamically for table headers
  const allProjects = Array.from(
    new Set(data.flatMap((row) => Object.keys(row).filter((k) => k !== "employee")))
  );

  return (
    <div className="usage-summary-wrapper">
      <div className="filters" style={{ marginBottom: "1rem" }}>
        <div className="filter-item date-range">
          <label>Date Range:</label>
          <div className="date-inputs">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <span className="date-separator">to</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
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
              {data.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.employee}</td>
                  {allProjects.map((project) => (
                    <td key={project}>{row[project] || 0}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
