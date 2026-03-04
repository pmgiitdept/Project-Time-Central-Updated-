// components/EmployeeProfile/Employee360Modal.jsx
import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import useEmployee360 from "../../hooks/useEmployee360";
import "../styles/Employee360.css";

function getWeekNumber(d) {
    const date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

export default function Employee360Modal({ employee, projects, onClose }) {
  const data = useEmployee360(employee?.employee_no, projects);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEsc);

    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);
  
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

          <h2>👤 Manpower Profile</h2>
          <h3>
            {employee.full_name}{" "}
            <span style={{ opacity: 0.6 }}>
              ({employee.employee_no})
            </span>
          </h3>

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

            {data?.timeline?.length > 0 && (
            <div className="employee360-timeline">
                <h4>🗓 Work Timeline (Weekly View)</h4>

                <div className="timeline-calendar">
                {(() => {

                    const days = [...data.timeline].sort((a, b) => new Date(a.date) - new Date(b.date));

                    const weeksMap = {};
                    days.forEach((day) => {
                    const dt = new Date(day.date);
                    const weekKey = `${dt.getFullYear()}-W${getWeekNumber(dt)}`;
                    if (!weeksMap[weekKey]) weeksMap[weekKey] = [];
                    weeksMap[weekKey].push(day);
                    });

                    return Object.entries(weeksMap).map(([week, daysInWeek]) => (
                    <div className="timeline-week" key={week}>
                        <div className="week-label">{week}</div>
                        <div className="week-days">
                            {daysInWeek.map((day) => {
                            const dt = new Date(day.date);
                            const formattedDate = dt.toLocaleDateString();

                            return (
                                <div
                                key={day.date}
                                className={`week-day ${day.isConflict ? "conflict" : ""}`}
                                title={`Date: ${formattedDate}\nProjects: ${day.projects.join(", ")}\nHours: ${day.hours.toFixed(2)}`}
                                >
                                <div className="day-date">{formattedDate}</div>

                                <div className="day-projects">
                                    {day.projects.map((p) => (
                                    <span key={p} className="day-project">{p}</span>
                                    ))}
                                </div>

                                {day.isConflict && <span className="day-conflict">⚠</span>}
                                </div>
                            );
                            })}
                        </div>
                        </div>
                    ));
                })()}
                </div>
            </div>
            )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
