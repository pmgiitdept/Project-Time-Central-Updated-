// components/EmployeeProfile/Employee360Modal.jsx
import { motion, AnimatePresence } from "framer-motion";
import useEmployee360 from "../../hooks/useEmployee360";
import "../styles/Employee360.css";

export default function Employee360Modal({ employee, projects, onClose }) {
  const data = useEmployee360(employee?.employee_no, projects);

  if (!employee) return null;

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
          <h3>
            {employee.full_name}{" "}
            <span style={{ opacity: 0.6 }}>
              ({employee.employee_no})
            </span>
          </h3>

          {/* Summary */}
          {data && (
            <div className="employee360-summary">
              <p>
                <strong>Total Hours</strong>
                <span>{data.totalHours.toFixed(2)}</span>
              </p>
              <p>
                <strong>Logged Days</strong>
                <span>{data.uniqueDays}</span>
              </p>
              <p>
                <strong>Projects Involved</strong>
                <span>{data.projectCount}</span>
              </p>
              <p>
                <strong>Reliever</strong>
                <span>{data.isReliever ? "Yes" : "No"}</span>
              </p>
            </div>
          )}

          {/* Conflicts */}
          {data?.conflictCount > 0 && (
            <div
              className={`employee360-conflicts ${data.conflictLevel.toLowerCase()}`}
            >
              <h4>
                ⚠ Conflict Days: {data.conflictCount}
                <span className="conflict-badge">
                  {data.conflictLevel}
                </span>
              </h4>

              <ul className="conflict-list">
                {data.conflictDays.map((c) => (
                  <li key={c.date}>
                    <strong>
                      {new Date(c.date).toLocaleDateString()}:
                    </strong>{" "}
                    {c.projects.join(", ")}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Timeline Table */}
            {data?.timeline?.length > 0 && (
            <div className="employee360-timeline">
                <h4>🗓 Work Timeline</h4>
                <div className="timeline-table-wrapper">
                <table className="timeline-table">
                    <thead>
                    <tr>
                        <th>Date</th>
                        <th>Projects</th>
                        <th>Total Hours</th>
                        <th>Conflict</th>
                    </tr>
                    </thead>
                    <tbody>
                    {data.timeline.map((day) => (
                        <tr key={day.date} className={day.isConflict ? "conflict-row" : ""}>
                        <td>{new Date(day.date).toLocaleDateString()}</td>
                        <td>
                            {day.projects.map((p) => (
                            <div key={p} className="timeline-project">
                                {p}
                            </div>
                            ))}
                        </td>
                        <td>{day.hours.toFixed(2)}</td>
                        <td>{day.isConflict ? "⚠" : "-"}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            </div>
            )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
