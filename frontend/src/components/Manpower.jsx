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
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    fetchFiles();
  }, []);

  const resetFilters = () => {
    setUploaderFilter("");
    setFromDate("");
    setToDate("");
    setSearchText("");
  };

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
              projects: new Set(),
              rows: [],
            });
          }
          const emp = empMap.get(row.employee_no);
          emp.rows.push(row);
          emp.projects.add(file.uploaded_by?.full_name || file.uploaded_by?.username || "Unknown");
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

  const allEmployees = useMemo(() => {
    const regular = new Map();
    const relievers = new Map();

    files.forEach(file => {
      if (uploaderFilter && file.project !== uploaderFilter) return;

      file.employees.forEach(emp => {
        const existingEmpMap = isReliever(emp) ? relievers : regular;
        if (!existingEmpMap.has(emp.employee_no)) {
          existingEmpMap.set(emp.employee_no, { ...emp, projects: new Set(emp.projects) });
        } else {
          emp.projects.forEach(p => existingEmpMap.get(emp.employee_no).projects.add(p));
        }
      });
    });

    return {
      regular: Array.from(regular.values()),
      relievers: Array.from(relievers.values()),
    };
  }, [files, uploaderFilter]);

  const uniqueUploaders = [...new Set(files.map(f => f.project).filter(Boolean))];

    const projectCounts = useMemo(() => {
    const regularCounts = {};
    const relieverCounts = {};

    allEmployees.regular.forEach(emp => {
        emp.projects.forEach(proj => {
        regularCounts[proj] = (regularCounts[proj] || 0) + 1;
        });
    });

    allEmployees.relievers.forEach(emp => {
        emp.projects.forEach(proj => {
        relieverCounts[proj] = (relieverCounts[proj] || 0) + 1;
        });
    });

    return { regularCounts, relieverCounts };
    }, [allEmployees]);

  return (
    <motion.div className="manpower-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
    <h2>👥 Manpower Monitoring</h2>

    <div className="manpower-filters">
  <div className="filters-left">
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

  <div className="filters-right">
    <div className="filter-item search-employee">
      <label>Search Employee</label>
      <input
        type="text"
        placeholder="Name or Employee No"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
      />
    </div>

    <div className="filter-item reset-filters">
      <button onClick={resetFilters}>Reset Filters</button>
    </div>
  </div>
</div>

    <div className="manpower-summary">
        <div className="summary-card">
            <strong>Total Employees</strong>
            <span>{allEmployees.regular.length}</span>
        </div>
        <div className="summary-card">
            <strong>Total Relievers</strong>
            <span>{allEmployees.relievers.length}</span>
        </div>
        <div className="summary-card">
            <strong>Total Projects</strong>
            <span>{uniqueUploaders.length}</span>
        </div>
    </div>

    {loading && <p>Loading manpower...</p>}

    {!loading && (
    <div className="manpower-tables-container">
        {/* Regular Employees Table */}
        <div className="manpower-section">
            <h3 className="section-title">
                Regular Employees
                <span className="section-badge">{allEmployees.regular.length} total</span>
            </h3>
            <div className="manpower-table-wrapper">
                <table className="manpower-table">
                    <thead>
                        <tr>
                        <th>Employee No</th>
                        <th>Full Name</th>
                        <th>Projects</th>
                        </tr>
                    </thead>
                    <tbody>
                        {allEmployees.regular.map(emp => (
                        <tr key={emp.employee_no}>
                            <td>{emp.employee_no}</td>
                            <td>{emp.full_name}</td>
                            <td>
                            {Array.from(emp.projects).map(p => (
                                <span key={p} className="project-badge">{p}</span>
                            ))}
                            </td>
                        </tr>
                        ))}
                        {allEmployees.regular.length === 0 && (
                        <tr>
                            <td colSpan={3} className="empty-row">No employees found</td>
                        </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

            {/* Relievers Table */}
        <div className="manpower-section">
            <h3 className="section-title">
                Relievers
                <span className="section-badge">{allEmployees.relievers.length} total</span>
            </h3>
            <div className="manpower-table-wrapper">
                <table className="manpower-table">
                    <thead>
                        <tr>
                        <th>Employee No</th>
                        <th>Full Name</th>
                        <th>Projects</th>
                        </tr>
                    </thead>
                    <tbody>
                        {allEmployees.relievers.map(emp => (
                        <tr key={emp.employee_no}>
                            <td>{emp.employee_no}</td>
                            <td>{emp.full_name}</td>
                            <td>
                            {Array.from(emp.projects).map(p => (
                                <span key={p} className="project-badge">{p}</span>
                            ))}
                            </td>
                        </tr>
                        ))}
                        {allEmployees.relievers.length === 0 && (
                        <tr>
                            <td colSpan={3} className="empty-row">No relievers found</td>
                        </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    )}
    </motion.div>
  );
}