/* EmployeeDtrModal.jsx */
import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api";
import { toast } from "react-toastify";
import "./styles/EmployeeDtrModal.css";

const getDateRange = (start, end) => {
  const dates = [];
  const current = new Date(start);
  const last = new Date(end);

  current.setHours(12, 0, 0, 0); // noon = extra safety
  last.setHours(12, 0, 0, 0);

  while (current <= last) {
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, "0");
    const dd = String(current.getDate()).padStart(2, "0");

    dates.push(`${yyyy}-${mm}-${dd}`);
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const options = { year: "numeric", month: "long", day: "numeric" };
  return new Date(dateStr).toLocaleDateString("en-US", options);
};

const formatDailyHeader = (dateStr) => {
  const date = new Date(dateStr);
  const day = date.toLocaleDateString("en-US", { weekday: "short" });
  const d = date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit" });
  return `${day} ${d}`;
};

const normalizeEmployeeNo = (val, length = 5) => {
  if (val === null || val === undefined) return null;
  return String(val).padStart(length, "0");
};

export default function EmployeeDtrModal({
  employee,
  isOpen,
  onClose,
  role = "viewer",
}) {
  const [dtrGroups, setDtrGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    if (!employee || !isOpen) return;

    const fetchDtr = async () => {
      setLoading(true);
      try {
        const res = await api.get("/files/dtr/entries/employee/", {
          params: {
            employee_code: normalizeEmployeeNo(employee.employee_code),
          },
        });

        const data = res.data || [];
        const grouped = {};

        data.forEach((entry) => {
          const project = entry.project || "Unknown Project";
          if (!grouped[project]) grouped[project] = [];
          grouped[project].push(entry);
        });

        const structured = Object.entries(grouped).map(([project, records]) => ({
          project,
          entries: records,
        }));

        setDtrGroups(structured);
      } catch (err) {
        toast.error("Failed to fetch DTR records");
      } finally {
        setLoading(false);
      }
    };

    fetchDtr();
  }, [employee, isOpen]);

  // 🧠 Click outside + ESC close behavior
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleEsc = (event) => {
      if (event.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEsc);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && employee && (
        <motion.div
          className="dtr-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="dtr-modal-content"
            ref={modalRef}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <h2>DTR History — {employee.employee_name}</h2>
            <button className="close-btn" onClick={onClose}>
              ✖
            </button>

            {loading ? (
              <p>Loading...</p>
            ) : dtrGroups.length === 0 ? (
              <p>No DTR records found.</p>
            ) : (
              dtrGroups.map((projGroup, projIdx) => (
                <div key={projIdx} className="project-history-block">
                  <h3 className="project-header">
                    🏢 Project: <span>{projGroup.project}</span>
                  </h3>

                  {projGroup.entries.map((group, idx) => {
                    const rows = group.rows;
                    if (!rows || rows.length === 0) return null;

                    const dailyDates = getDateRange(group.start_date, group.end_date);

                    const headers = [
                      { key: "full_name", label: "Full Name" },
                      { key: "employee_no", label: "Employee #" },
                      { key: "time", label: "Time" },
                      ...dailyDates.map((d) => ({
                        key: d,
                        label: formatDailyHeader(d),
                      })),
                      { key: "total_days", label: "Total Days" },
                      { key: "total_hours", label: "Total Hours" },
                      { key: "regular_ot", label: "OT" },
                      { key: "legal_holiday", label: "Legal Holiday" },
                      { key: "unworked_reg_holiday", label: "Unworked Reg Holiday" },
                      { key: "special_holiday", label: "Special Holiday" },
                      { key: "night_diff", label: "Night Diff" },
                      { key: "undertime_minutes", label: "Undertime" },
                    ];

                    return (
                      <div key={idx} className="dtr-table-wrapper">
                        <h4 className="coverage">
                          Coverage: {formatDate(group.start_date)} →{" "}
                          {formatDate(group.end_date)}
                        </h4>

                        <div className="dtr-scroll-container">
                          <table className="dtr-table">
                            <thead>
                              <tr>
                                {headers.map((col) => (
                                  <th key={col.key}>{col.label}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((rec, rIdx) => {
                                const totalDays = dailyDates.reduce((count, d) => {
                                  const val = rec.daily_data[d];

                                  // Count as 1 if value exists AND is numeric
                                  if (val !== null && val !== "" && !isNaN(val)) {
                                    return count + 1;
                                  }
                                  return count;
                                }, 0);

                                return (
                                  <tr key={rIdx}>
                                    <td>{rec.full_name}</td>
                                    <td>{rec.employee_no}</td>
                                    <td>{rec.time}</td>
                                    {dailyDates.map((d) => (
                                      <td key={d}>{rec.daily_data[d] || ""}</td>
                                    ))}

                                    {/* ✅ Total Days (count-only, not sum) */}
                                    <td>{totalDays}</td>

                                    <td>{rec.total_hours}</td>
                                    <td>{rec.regular_ot}</td>
                                    <td>{rec.legal_holiday}</td>
                                    <td>{rec.unworked_reg_holiday}</td>
                                    <td>{rec.special_holiday}</td>
                                    <td>{rec.night_diff}</td>
                                    <td>{rec.undertime_minutes}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
