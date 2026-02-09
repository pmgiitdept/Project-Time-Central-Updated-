/* components/UsageSummary.jsx */
import { useEffect, useMemo, useState } from "react";
import api from "../api";
import EmployeeDtrModal from "./EmployeeDtrModal"; // ✅ Use your modal
import OperationsMonitoring from "./OperationsMonitoring";
import { motion } from "framer-motion";
import "./styles/UsageSummary.css";

export default function UsageSummary() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);

  // 🔽 Filters
  const [selectedProject, setSelectedProject] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // 🔍 Employee search per project
  const [employeeSearch, setEmployeeSearch] = useState({});

  const generatedAt = useMemo(() => new Date(), []);

  const [collapsedProjects, setCollapsedProjects] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("usageSummaryCollapsed")) || {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    fetchUsageSummary();
  }, []);

  // 🔹 Fetch usage summary using same structure as DTRTable
  const fetchUsageSummary = async () => {
    setLoading(true);
    try {
      const res = await api.get("/files/dtr/files/");
      const files = res.data.results || res.data;

      const verifiedFiles = files.filter(file => file.status === "verified");
      const summaries = [];

      for (const file of verifiedFiles) {
        const contentRes = await api.get(`/files/dtr/files/${file.id}/content/`);
        const rows = contentRes.data.rows || [];

        // Map employees from rows directly
        const employeeMap = new Map();
        rows.forEach((row) => {
            if (!row?.employee_no) return;

            if (!employeeMap.has(row.employee_no)) {
                employeeMap.set(row.employee_no, {
                full_name: row.full_name,
                employee_no: row.employee_no,
                employee_code: row.employee_no,
                rows: [],
                });
            }

            // ✅ Add all rows to the employee
            employeeMap.get(row.employee_no).rows.push(row);
            });

        summaries.push({
          file_id: file.id,
          project: file.uploaded_by?.full_name || file.uploaded_by?.username || "Unknown",
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
      proj.employees.forEach((e) => employeeSet.add(e.employee_no));

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

  // 🔹 Helper: employee count badge
  const getEmployeeBadge = (count) => {
    if (count >= 200) return { text: "⚠ High manpower usage", color: "#d32f2f" };
    if (count >= 100) return { text: "ℹ️ Large manpower", color: "#fbc02d" };
    return null;
  };

  // Calculate logged days and total hours for an employee across all their rows
  const calculateEmployeeSummary = (emp, projStart, projEnd) => {
    if (!emp.rows || emp.rows.length === 0 || !projStart || !projEnd) {
      return { logged: 0, expected: 0, totalHours: 0 };
    }

    // Expected days = project coverage days
    const start = new Date(projStart);
    const end = new Date(projEnd);
    const expectedDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    let loggedDays = 0;
    let totalHours = 0;

    emp.rows.forEach((row) => {
      if (!row.daily_data) return;

      // Count each date entry per row (even duplicates)
      Object.keys(row.daily_data).forEach((date) => {
        const val = row.daily_data[date];
        if (val !== null && val !== "" && !isNaN(val)) {
          loggedDays += 1; // Count every row occurrence
        }
      });

      // ✅ Sum total_hours for all rows safely
      totalHours += Number(row.total_hours) || 0;
    });

    // Avoid showing 0 before actual calculation
    totalHours = totalHours ? totalHours : 0;

    return { logged: loggedDays, expected: expectedDays, totalHours };
  };
  
  // 🆕 Check if employee is a reliever based on their position in any row
  const isReliever = (emp) => {
    return emp.rows.some(row => {
      const pos = row.position || "";
      return /reliever/i.test(pos); // matches "RELIEVER", "reliever", "DayOff Reliever", etc.
    });
  };

  const employeePresenceMap = useMemo(() => {
    const map = {};

    projects.forEach((proj) => {
      proj.employees.forEach((emp) => {
        if (!map[emp.employee_no]) {
          map[emp.employee_no] = {
            projects: new Set(),
            files: new Set(),
          };
        }

        map[emp.employee_no].projects.add(proj.project);
        map[emp.employee_no].files.add(proj.file_id);
      });
    });

    return map;
  }, [projects]);

  const exportToCSV = (projects) => {
    const rows = [];

    rows.push([
      "Project",
      "Employee No",
      "Full Name",
      "Logged Days",
      "Expected Days",
      "Total Hours",
      "Projects Involved",
      "Files Involved",
      "Reliever",
    ]);

    projects.forEach((proj) => {
      proj.employees.forEach((emp) => {
        const summary = calculateEmployeeSummary(
          emp,
          proj.start_date,
          proj.end_date
        );

        const presence = employeePresenceMap[emp.employee_no];

        rows.push([
          proj.project,
          emp.employee_no,
          emp.full_name,
          summary.logged,
          summary.expected,
          summary.totalHours,
          presence?.projects.size || 0,
          presence?.files.size || 0,
          isReliever(emp) ? "Yes" : "No", // ✅ reliever info
        ]);
      });
    });

    const csvContent = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Manpower_Usage_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  const toggleProjectCollapse = (fileId) => {
    setCollapsedProjects((prev) => {
      const updated = {
        ...prev,
        [fileId]: !prev[fileId],
      };
      localStorage.setItem("usageSummaryCollapsed", JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <motion.div
        className="employee-top-bar"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
    >
    <div className="usage-summary">
      <h2>📊 Project Manpower Usage Summary</h2>

      {/* 🆕 STEP 1: Summary Bar */}
      <div className="usage-summary-bar">
        <div>📦 <strong>Projects:</strong> {summary.projectCount}</div>
        <div>👥 <strong>Employees:</strong> {summary.employeeCount}</div>
        <div>📅 <strong>Coverage:</strong> {summary.start?.toLocaleDateString() || "N/A"} – {summary.end?.toLocaleDateString() || "N/A"}</div>

        <div className="snapshot-meta">
          📌 Generated on: {generatedAt.toLocaleString()}
        </div>
      </div>

      {/* 🧭 Operations Monitoring */}
      <OperationsMonitoring projects={filteredProjects} />

      {/* 🔽 Filters */}
      <div className="usage-filters">
        <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
          <option value="">All Projects</option>
          {projectOptions.map((proj) => (
            <option key={proj} value={proj}>{proj}</option>
          ))}
        </select>

        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />

        <button
          className="export-button"
          onClick={() => exportToCSV(filteredProjects)}
        >
          Export CSV
        </button>
      </div>

       {loading && <p>Loading records...</p>}

        {!loading && filteredProjects.map((proj) => {
          const searchText = employeeSearch[proj.file_id] || "";
          const filteredEmployees = proj.employees.filter((emp) => {
            const text = searchText.toLowerCase();
            return emp.employee_no.toLowerCase().includes(text) || emp.full_name.toLowerCase().includes(text);
          });

          const badge = getEmployeeBadge(proj.totalEmployees);

          return (
            <div key={proj.file_id} className="usage-card">
              <div className="usage-header">
                <div className="usage-header-left">
                  <button
                    className="collapse-toggle"
                    onClick={() => toggleProjectCollapse(proj.file_id)}
                  >
                    {collapsedProjects[proj.file_id] ? "▶" : "▼"}
                  </button>
                  <h3>{proj.project}</h3>
                </div>

                <span className="cutoff">
                  {proj.start_date ? new Date(proj.start_date).toLocaleDateString() : "N/A"} →
                  {proj.end_date ? new Date(proj.end_date).toLocaleDateString() : "N/A"}
                </span>
              </div>
              {!collapsedProjects[proj.file_id] && (
              <>
              <p>👥 <strong>Total Employees:</strong> {proj.totalEmployees} {badge && <span className="employee-badge" style={{ color: badge.color }}>{badge.text}</span>}</p>

              <input
                type="text"
                className="search-employee"
                placeholder="Search employee no or name..."
                value={employeeSearch[proj.file_id] || ""}
                onChange={(e) => setEmployeeSearch(prev => ({ ...prev, [proj.file_id]: e.target.value }))}
              />

              <div className="usage-table-wrapper">
                <table className="usage-table">
                  <thead>
                    <tr>
                      <th>Employee No</th>
                      <th>Full Name</th>
                      <th>Attendance</th>
                      <th>Total Hours</th>
                      <th>Presence</th>
                      <th>Reliever</th> {/* ✅ New column */}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map((emp) => {
                      const summary = calculateEmployeeSummary(emp, proj.start_date, proj.end_date);
                      const presence = employeePresenceMap[emp.employee_no];
                      return (
                        <tr key={emp.employee_no}>
                          <td>{emp.employee_no}</td>
                          <td>{emp.full_name}</td>
                          <td>{summary.logged} / {summary.expected} {summary.logged < summary.expected && <span className="missing-days">⚠</span>}</td>
                          <td>{summary.totalHours.toFixed(2).replace(/\.00$/, "")} hrs</td>
                          <td>{presence ? `${presence.projects.size} project(s) / ${presence.files.size} file(s)` : "—"}</td>
                          <td>{isReliever(emp) ? "Yes" : "No"}</td> {/* ✅ Display reliever */}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filteredEmployees.length > 15 && <div className="table-hint">Scroll to view more</div>}
              {filteredEmployees.length === 0 && <div className="table-hint">No matching employees found</div>}
              </>
               )} {/* End of collapse check */}
             </div>
          );
        })}
    </div>
    </motion.div>
  );
}
