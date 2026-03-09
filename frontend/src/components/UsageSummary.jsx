/* components/UsageSummary.jsx */
import { useEffect, useMemo, useState } from "react";
import api from "../api";
import EmployeeDtrModal from "./EmployeeDtrModal"; 
import OperationsMonitoring from "./OperationsMonitoring";
import Employee360Modal from "./EmployeeProfile/Employee360Modal";
import { motion, AnimatePresence } from "framer-motion";
import "./styles/UsageSummary.css";

export default function UsageSummary() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedProject, setSelectedProject] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showScrollTop, setShowScrollTop] = useState(false);

  const [employeeSearch, setEmployeeSearch] = useState({});

  const generatedAt = useMemo(() => new Date(), []);

  const [selectedEmployee, setSelectedEmployee] = useState(null);

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

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 200) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

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

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (selectedProject && p.project !== selectedProject) return false;
      if (fromDate && new Date(p.start_date) < new Date(fromDate)) return false;
      if (toDate && new Date(p.end_date) > new Date(toDate)) return false;
      return true;
    });
  }, [projects, selectedProject, fromDate, toDate]);

  const projectOptions = [...new Set(projects.map((p) => p.project))];

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

  const getEmployeeBadge = (count) => {
    if (count >= 200) return { text: "⚠ High manpower usage", color: "#d32f2f" };
    if (count >= 100) return { text: "ℹ️ Large manpower", color: "#fbc02d" };
    return null;
  };

  const calculateEmployeeSummary = (emp, projStart, projEnd) => {
  if (!emp.rows?.length || !projStart || !projEnd) {
    return { logged: 0, expected: 0, totalHours: 0 };
  }

  const start = new Date(projStart);
  const end = new Date(projEnd);
  const expectedDays =
    Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

  const dateHourMap = new Map();

  emp.rows.forEach((row) => {
    if (!row.daily_data) return;

    Object.entries(row.daily_data).forEach(([date, value]) => {
      const numericVal = Number(value);

      if (!isNaN(numericVal) && numericVal > 0) {
        if (!dateHourMap.has(date)) {
          dateHourMap.set(date, numericVal);
        } else {
          const existing = dateHourMap.get(date);
          dateHourMap.set(date, Math.max(existing, numericVal));
        }
      }
    });
  });

  const loggedDays = dateHourMap.size;

    let totalHours = 0;
    dateHourMap.forEach((val) => {
      totalHours += val;
    });

    return {
      logged: loggedDays,
      expected: expectedDays,
      totalHours,
    };
  };
  
  const isReliever = (emp) => {
    return emp.rows.some(row => {
      const position = row.position || "";
      const shift = row.shift || "";
      const time = row.time || "";

      const combined = `${position} ${shift} ${time}`.toLowerCase();

      return combined.includes("reliever");
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

  const crossValidationMap = useMemo(() => {
    const map = {};

    projects.forEach((proj) => {
      const projStart = new Date(proj.start_date);
      const projEnd = new Date(proj.end_date);

      proj.employees.forEach((emp) => {
        if (!map[emp.employee_no]) 
          map[emp.employee_no] = { relieverConflict: false, missingDays: false, fileMismatch: false, fileMismatchType: [] };

        const empCross = map[emp.employee_no];

        if (isReliever(emp)) {
          const overlappingFiles = Array.from(employeePresenceMap[emp.employee_no]?.files || []).filter(fid => {
            const otherProj = projects.find(p => p.file_id === fid);
            if (!otherProj || otherProj.file_id === proj.file_id) return false;

            const oStart = new Date(otherProj.start_date);
            const oEnd = new Date(otherProj.end_date);
            return !(projEnd < oStart || projStart > oEnd);
          });
          if (overlappingFiles.length > 0) empCross.relieverConflict = true;
        }

        const summary = calculateEmployeeSummary(emp, proj.start_date, proj.end_date);
        const missingDaysCount = summary.expected - summary.logged;
        if (missingDaysCount > 2) empCross.missingDays = true;

        emp.rows.forEach((row) => {
          const totalHours = Number(row.total_hours) || 0;
          const ot = Number(row.ot) || 0;
          const legalHoliday = Number(row.legal_holiday) || 0;
          const specialHoliday = Number(row.special_holiday) || 0;

          let dailySum = 0;
          if (row.daily_data) {
            dailySum = Object.values(row.daily_data).reduce((acc, val) => {
              const n = Number(val);
              return acc + (isNaN(n) ? 0 : n);
            }, 0);
          }

          const diff = totalHours - (dailySum + ot + legalHoliday + specialHoliday);

          if (diff !== 0) {
            empCross.fileMismatch = true;
            if (!empCross.fileMismatchType) empCross.fileMismatchType = [];
            if (diff > 0) empCross.fileMismatchType.push(`Summary too low by ${diff} hrs`);
            else empCross.fileMismatchType.push(`Summary too high by ${Math.abs(diff)} hrs`);
          }
        });
      });
    });

    return map;
  }, [projects, employeePresenceMap]);

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
          isReliever(emp) ? "Yes" : "No", 
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

  const hasNonRelieverEntry = (emp) => {
    return emp.rows.some(row => {
      const position = row.position || "";
      const shift = row.shift || "";
      const time = row.time || "";

      const combined = `${position} ${shift} ${time}`.toLowerCase();

      return !combined.includes("reliever");
    });
  };

  const getNonRelieverCount = (employees) => {
    const uniqueEmployees = new Map();

    employees.forEach(emp => {
      if (!uniqueEmployees.has(emp.employee_no)) {
        uniqueEmployees.set(emp.employee_no, emp);
      }
    });

    return Array.from(uniqueEmployees.values()).filter(emp =>
      hasNonRelieverEntry(emp)
    ).length;
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

      <OperationsMonitoring projects={filteredProjects} />

      <h2>📊 Project Manpower Usage Summary</h2>

      <div className="usage-summary-bar">
        <div>📦 <strong>Projects:</strong> {summary.projectCount}</div>
        <div>👥 <strong>Employees:</strong> {summary.employeeCount}</div>
        <div>📅 <strong>Coverage:</strong> {summary.start?.toLocaleDateString() || "N/A"} – {summary.end?.toLocaleDateString() || "N/A"}</div>

        <div className="snapshot-meta">
          📌 Generated on: {generatedAt.toLocaleString()}
        </div>
      </div>

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
                  <motion.button
                    className="collapse-toggle"
                    onClick={() => toggleProjectCollapse(proj.file_id)}
                    animate={{ rotate: collapsedProjects[proj.file_id] ? 0 : 90 }}
                    transition={{ duration: 0.2 }}
                  >
                    ▶
                  </motion.button>
                  <h3>{proj.project}</h3>
                </div>

                <span className="cutoff">
                  {proj.start_date ? new Date(proj.start_date).toLocaleDateString() : "N/A"} →
                  {proj.end_date ? new Date(proj.end_date).toLocaleDateString() : "N/A"}
                </span>
              </div>
              <AnimatePresence initial={false}>
              {!collapsedProjects[proj.file_id] && (
                <motion.div
                  key="collapsible-content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{
                    duration: 0.25,
                    ease: "easeInOut",
                  }}
                  style={{ overflow: "hidden" }}
                >
              {(() => {
                const nonRelieverCount = getNonRelieverCount(proj.employees);
                const badge = getEmployeeBadge(nonRelieverCount);

                return (
                  <p className="total-employees">
                    👥 <strong>Total Employees:</strong> {nonRelieverCount}
                    {badge && (
                      <span className="employee-badge" style={{ color: badge.color }}>
                        {badge.text}
                      </span>
                    )}
                    <small className="muted-note">
                      (relievers excluded)
                    </small>
                  </p>
                );
              })()}

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
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map((emp) => {
                      const summary = calculateEmployeeSummary(emp, proj.start_date, proj.end_date);
                      const presence = employeePresenceMap[emp.employee_no];
                      return (
                        <tr key={emp.employee_no}>
                          <td>
                            <button
                              className="employee-link"
                              onClick={() => setSelectedEmployee(emp)}
                            >
                              {emp.employee_no}
                            </button>
                          </td>
                          <td>{emp.full_name}</td>
                          <td>{summary.logged} / {summary.expected} {summary.logged < summary.expected && <span className="missing-days">⚠</span>}</td>
                          <td>{summary.totalHours.toFixed(2).replace(/\.00$/, "")} hrs</td>
                          <td>{presence ? `${presence.projects.size} project(s) / ${presence.files.size} file(s)` : "—"}</td>
                          <td className="cross-validation">
                            {crossValidationMap[emp.employee_no]?.relieverConflict && (
                              <span className="badge reliever-conflict" title="Reliever overlapping projects">⚠ Reliever</span>
                            )}
                            {crossValidationMap[emp.employee_no]?.missingDays && (
                              <span className="badge missing-days" title="Missing attendance days">⚠ Missing Days</span>
                            )}
                            {crossValidationMap[emp.employee_no]?.fileMismatch && (
                              <span
                                className="badge file-mismatch"
                                title={crossValidationMap[emp.employee_no]?.fileMismatchType?.join("; ")}
                              >
                                ⚠ Mismatch
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filteredEmployees.length > 15 && <div className="table-hint">Scroll to view more</div>}
              {filteredEmployees.length === 0 && <div className="table-hint">No matching employees found</div>}
              </motion.div>
                )}
              </AnimatePresence>
             </div>
          );
        })}
    </div>

    <Employee360Modal
      employee={selectedEmployee}
      projects={projects}
      onClose={() => setSelectedEmployee(null)}
    />

    <AnimatePresence>
      {showScrollTop && (
        <motion.button
          className="scroll-top-btn"
          onClick={scrollToTop}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.25 }}
        >
          ↑
        </motion.button>
      )}
    </AnimatePresence>
    </motion.div>
  );
}