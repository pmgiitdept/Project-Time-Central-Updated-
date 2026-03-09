/* components/Manpower.jsx */
import { useEffect, useMemo, useState } from "react";
import api from "../api";
import { motion } from "framer-motion";
import "./styles/Manpower.css";

export default function Manpower() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [uploaderFilter, setUploaderFilter] = useState("");

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await api.get("/files/dtr/files/");
      const verified = (res.data.results || res.data).filter(f => f.status === "verified");

      const processed = [];

      for (const file of verified) {
        const contentRes = await api.get(`/files/dtr/files/${file.id}/content/`);
        const rows = contentRes.data.rows || [];

        const empMap = new Map();

        rows.forEach(row => {
          if (!row.employee_no) return;
          if (!empMap.has(row.employee_no)) {
            empMap.set(row.employee_no, {
              employee_no: row.employee_no,
              full_name: row.full_name,
              rows: [],
            });
          }
          empMap.get(row.employee_no).rows.push(row);
        });

        processed.push({
          id: file.id,
          project: file.uploaded_by?.full_name || file.uploaded_by?.username || "Unknown",
          start_date: file.start_date,
          end_date: file.end_date,
          employees: Array.from(empMap.values()),
        });
      }

      setFiles(processed);
    } catch (err) {
      console.error("Manpower load failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const isReliever = (emp) => {
    return emp.rows.some(row => {
      const combined = `${row.position || ""} ${row.shift || ""} ${row.time || ""}`.toLowerCase();
      return combined.includes("reliever");
    });
  };

  const filteredFiles = useMemo(() => {
    return files.filter(f => {
      if (fromDate && new Date(f.start_date) < new Date(fromDate)) return false;
      if (toDate && new Date(f.end_date) > new Date(toDate)) return false;
      if (uploaderFilter && f.project !== uploaderFilter) return false;
      return true;
    });
  }, [files, fromDate, toDate, uploaderFilter]);

  const manpowerData = useMemo(() => {
    const regular = new Map();
    const relievers = new Map();

    filteredFiles.forEach(file => {
      file.employees.forEach(emp => {
        if (isReliever(emp)) relievers.set(emp.employee_no, emp);
        else regular.set(emp.employee_no, emp);
      });
    });

    return {
      regular: Array.from(regular.values()),
      relievers: Array.from(relievers.values()),
    };
  }, [filteredFiles]);

  const uniqueUploaders = [...new Set(files.map(f => f.project).filter(Boolean))];

  return (
    <motion.div className="manpower-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2>👥 Manpower Monitoring</h2>

      {/* Filters */}
      <div className="manpower-filters">
        <div className="filter-item">
          <label>Project / Uploader</label>
          <select value={uploaderFilter} onChange={(e) => setUploaderFilter(e.target.value)}>
            <option value="">All Projects</option>
            {uniqueUploaders.map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label>Start Date</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>

        <div className="filter-item">
          <label>End Date</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
      </div>

      {/* Summary */}
      <div className="manpower-summary">
        <div className="summary-card">
          <strong>Total Employees</strong>
          <span>{manpowerData.regular.length}</span>
        </div>
        <div className="summary-card">
          <strong>Total Relievers</strong>
          <span>{manpowerData.relievers.length}</span>
        </div>
      </div>

      {loading && <p>Loading manpower...</p>}

      {/* Tables */}
      {!loading && (
        <div className="manpower-tables">
          {/* Regular Employees */}
          <div className="manpower-table">
            <h3>Regular Employees</h3>
            <table>
              <thead>
                <tr>
                  <th>Employee No</th>
                  <th>Full Name</th>
                </tr>
              </thead>
              <tbody>
                {manpowerData.regular.map(emp => (
                  <tr key={emp.employee_no}>
                    <td>{emp.employee_no}</td>
                    <td>{emp.full_name}</td>
                  </tr>
                ))}
                {manpowerData.regular.length === 0 && (
                  <tr>
                    <td colSpan={2} className="empty-row">No employees found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Relievers */}
          <div className="manpower-table">
            <h3>Relievers</h3>
            <table>
              <thead>
                <tr>
                  <th>Employee No</th>
                  <th>Full Name</th>
                </tr>
              </thead>
              <tbody>
                {manpowerData.relievers.map(emp => (
                  <tr key={emp.employee_no}>
                    <td>{emp.employee_no}</td>
                    <td>{emp.full_name}</td>
                  </tr>
                ))}
                {manpowerData.relievers.length === 0 && (
                  <tr>
                    <td colSpan={2} className="empty-row">No relievers found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}