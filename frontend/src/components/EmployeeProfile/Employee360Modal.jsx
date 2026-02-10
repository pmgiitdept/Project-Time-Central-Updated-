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
          <button className="close-btn" onClick={onClose}>✖</button>

          <h2>👤 Employee 360° Profile</h2>
          <h3>{employee.full_name} ({employee.employee_no})</h3>

          {data && (
            <div className="employee360-summary">
              <p><strong>Total Hours:</strong> {data.totalHours.toFixed(2)}</p>
              <p><strong>Logged Days:</strong> {data.uniqueDays}</p>
              <p><strong>Projects Involved:</strong> {data.projectCount}</p>
              <p><strong>Reliever:</strong> {data.isReliever ? "Yes" : "No"}</p>
            </div>
          )}

          {data?.conflictCount > 0 && (
            <div className={`employee360-conflicts ${data.conflictLevel.toLowerCase()}`}>
                <h4>
                ⚠ Conflict Days: {data.conflictCount}
                <span className="conflict-badge">
                    {data.conflictLevel}
                </span>
                </h4>

                <ul className="conflict-list">
                {data.conflictDays.map((c) => (
                    <li key={c.date}>
                    <strong>{new Date(c.date).toLocaleDateString()}:</strong>{" "}
                    {c.projects.join(", ")}
                    </li>
                ))}
                </ul>
            </div>
            )}

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
