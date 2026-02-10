// components/EmployeeProfile/Employee360Modal.jsx
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useEmployee360 from "../../hooks/useEmployee360";
import "../styles/Employee360.css";

export default function Employee360Modal({ employee, projects, onClose }) {
  const data = useEmployee360(employee?.employee_no, projects);

  const [isTimelineOpen, setIsTimelineOpen] = useState(true);
  const [selectedFileId, setSelectedFileId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // --- ESC key handler ---
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!employee || !data) return null;

  // --- Prepare files list ---
  const projectFiles = useMemo(() => {
    return projects
      .map((proj) => {
        const emp = proj.employees?.find(e => e.employee_no === employee.employee_no);
        if (!emp) return null;
        return {
          id: proj.file_id || proj.project,
          name: proj.project,
          start: proj.start_date,
          end: proj.end_date,
        };
      })
      .filter(Boolean);
  }, [projects, employee]);

  // --- Filter timeline ---
  const filteredTimeline = useMemo(() => {
    let timeline = [...data.timeline];

    if (selectedFileId) {
      const file = projectFiles.find(f => f.id === selectedFileId);
      if (file) {
        timeline = timeline.filter(
          d => new Date(d.date) >= new Date(file.start) && new Date(d.date) <= new Date(file.end)
        );
      }
    }

    if (startDate) {
      timeline = timeline.filter(d => new Date(d.date) >= new Date(startDate));
    }
    if (endDate) {
      timeline = timeline.filter(d => new Date(d.date) <= new Date(endDate));
    }

    return timeline.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [data.timeline, selectedFileId, startDate, endDate, projectFiles]);

  return (
    <AnimatePresence>
      <motion.div
        className="employee360-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="employee360-modal"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
        >
          {/* Close */}
          <button className="close-btn" onClick={onClose}>✖</button>

          {/* Header */}
          <h2>👤 Manpower Profile</h2>
          <h3>{employee.full_name} <span style={{ opacity: 0.6 }}>({employee.employee_no})</span></h3>

          {/* Summary */}
          <div className="employee360-summary">
            <p><strong>Total Hours</strong> <span>{data.totalHours.toFixed(2)}</span></p>
            <p><strong>Logged Days</strong> <span>{data.uniqueDays}</span></p>
            <p><strong>Projects Involved</strong> <span>{data.projectCount}</span></p>
            <p><strong>Reliever</strong> <span>{data.isReliever ? "Yes" : "No"}</span></p>
          </div>

          {/* Conflicts */}
          {data.conflictCount > 0 && (
            <div className={`employee360-conflicts ${data.conflictLevel.toLowerCase()}`}>
              <h4>
                ⚠ Conflict Days: {data.conflictCount}
                <span className="conflict-badge">{data.conflictLevel}</span>
              </h4>
              <ul className="conflict-list">
                {data.conflictDays.map(c => (
                  <li key={c.date}>
                    <strong>{new Date(c.date).toLocaleDateString()}:</strong> {c.projects.join(", ")}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Timeline Filters */}
          {projectFiles.length > 0 && (
            <div className="timeline-filters">
              <label>
                File:
                <select value={selectedFileId} onChange={e => setSelectedFileId(e.target.value)}>
                  <option value="">All Files</option>
                  {projectFiles.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.start} - {f.end})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Start Date:
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </label>
              <label>
                End Date:
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </label>
            </div>
          )}

          {/* Collapsible Timeline */}
          {filteredTimeline.length > 0 && (
            <div className="employee360-timeline">
              <h4 onClick={() => setIsTimelineOpen(!isTimelineOpen)} style={{ cursor: "pointer" }}>
                🗓 Work Timeline (Daily View) {isTimelineOpen ? "▲" : "▼"}
              </h4>
              {isTimelineOpen && (
                <div className="timeline-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Projects</th>
                        <th>Hours</th>
                        <th>Conflict</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTimeline.map(day => {
                        const dt = new Date(day.date);
                        return (
                          <tr key={day.date} className={day.isConflict ? "conflict" : ""}>
                            <td>{dt.toLocaleDateString()}</td>
                            <td>{day.projects.join(", ")}</td>
                            <td>{day.hours.toFixed(2)}</td>
                            <td>{day.isConflict ? "⚠" : ""}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
