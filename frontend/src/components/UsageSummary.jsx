/* components/UsageSummary.jsx */
import { useEffect, useMemo, useState } from "react";
import api from "../api";
import "./styles/UsageSummary.css";

export default function UsageSummary() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);

  // 🔽 Filters
  const [selectedProject, setSelectedProject] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    fetchUsageSummary();
  }, []);

  const fetchUsageSummary = async () => {
    setLoading(true);
    try {
      const res = await api.get("/files/dtr/files/");
      const files = res.data.results || res.data;

      const summaries = [];

      for (const file of files) {
        const contentRes = await api.get(
          `/files/dtr/files/${file.id}/content/`
        );

        const rows = contentRes.data.rows || [];
        const employeeMap = new Map();

        rows.forEach((row) => {
          if (row?.employee_no) {
            employeeMap.set(row.employee_no, {
              full_name: row.full_name,
              employee_no: row.employee_no,
            });
          }
        });

        summaries.push({
          file_id: file.id,
          project:
            file.uploaded_by?.full_name ||
            file.uploaded_by?.username ||
            "Unknown",
          start_date: file.start_date,
          end_date: file.end_date,
          totalEmployees: employeeMap.size,
          employees: Array.from(employeeMap.values()),
        });
      }

      setProjects(summaries);
    } catch (err) {
      console.error("Failed to load usage summary:", err);
    } finally {
      setLoading(false);
    }
  };

  // 🔍 Apply filters
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (selectedProject && p.project !== selectedProject) return false;
      if (fromDate && new Date(p.start_date) < new Date(fromDate)) return false;
      if (toDate && new Date(p.end_date) > new Date(toDate)) return false;
      return true;
    });
  }, [projects, selectedProject, fromDate, toDate]);

  // 🧠 Unique project list for dropdown
  const projectOptions = [...new Set(projects.map((p) => p.project))];

  // 🆕 STEP 1: Summary Metrics
  const summary = useMemo(() => {
    const employeeSet = new Set();
    let minDate = null;
    let maxDate = null;

    filteredProjects.forEach((proj) => {
      proj.employees.forEach((e) =>
        employeeSet.add(e.employee_no)
      );

      if (proj.start_date) {
        const sd = new Date(proj.start_date);
        minDate = !minDate || sd < minDate ? sd : minDate;
      }

      if (proj.end_date) {
        const ed = new Date(proj.end_date);
        maxDate = !maxDate || ed > maxDate ? ed : maxDate;
      }
    });

    return {
      projectCount: filteredProjects.length,
      employeeCount: employeeSet.size,
      start: minDate,
      end: maxDate,
    };
  }, [filteredProjects]);

  return (
    <div className="usage-summary">
      <h2>📊 Project Manpower Usage Summary</h2>

      {/* 🆕 STEP 1: Summary Bar */}
      <div className="usage-summary-bar">
        <div>
          📦 <strong>Projects:</strong> {summary.projectCount}
        </div>
        <div>
          👥 <strong>Employees:</strong> {summary.employeeCount}
        </div>
        <div>
          📅 <strong>Coverage:</strong>{" "}
          {summary.start
            ? summary.start.toLocaleDateString()
            : "N/A"}{" "}
          –{" "}
          {summary.end
            ? summary.end.toLocaleDateString()
            : "N/A"}
        </div>
      </div>

      {/* 🔽 Filters */}
      <div className="usage-filters">
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
        >
          <option value="">All Projects</option>
          {projectOptions.map((proj) => (
            <option key={proj} value={proj}>
              {proj}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
        />

        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
        />
      </div>

      {loading && <p>Loading records...</p>}

      {!loading &&
        filteredProjects.map((proj) => (
          <div key={proj.file_id} className="usage-card">
            <div className="usage-header">
              <h3>{proj.project}</h3>
              <span className="cutoff">
                {proj.start_date
                  ? new Date(proj.start_date).toLocaleDateString()
                  : "N/A"}{" "}
                →{" "}
                {proj.end_date
                  ? new Date(proj.end_date).toLocaleDateString()
                  : "N/A"}
              </span>
            </div>

            <p>
              👥 <strong>Total Employees:</strong>{" "}
              {proj.totalEmployees}
            </p>

            <div className="usage-table-wrapper">
              <table className="usage-table">
                <thead>
                  <tr>
                    <th>Employee No</th>
                    <th>Full Name</th>
                  </tr>
                </thead>
                <tbody>
                  {proj.employees.slice(0, 15).map((emp) => (
                    <tr key={emp.employee_no}>
                      <td>{emp.employee_no}</td>
                      <td>{emp.full_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {proj.employees.length > 15 && (
              <div className="table-hint">
                Showing first 15 employees — scroll to view more
              </div>
            )}
          </div>
        ))}
    </div>
  );
}
