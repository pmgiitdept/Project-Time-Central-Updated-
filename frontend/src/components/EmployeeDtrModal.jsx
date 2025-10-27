import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import api from "../api";
import { toast } from "react-toastify";
import "./styles/EmployeeDtrModal.css";

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

export default function EmployeeDtrModal({
  employee,
  isOpen,
  onClose,
  role = "viewer",
}) {
  const [dtrGroups, setDtrGroups] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!employee || !isOpen) return;

    const fetchDtr = async () => {
      setLoading(true);
      try {
        const res = await api.get("/files/dtr/entries/employee/", {
          params: { employee_code: employee.employee_code },
        });

        let data = res.data || [];

        // 🔄 If backend doesn’t group by project, group it client-side
        const grouped = {};
        data.forEach((entry) => {
          const project = entry.project || "Unknown Project";
          if (!grouped[project]) grouped[project] = [];
          grouped[project].push(entry);
        });

        // Convert grouped object → array for rendering
        const structured = Object.entries(grouped).map(([project, records]) => ({
          project,
          entries: records,
        }));

        setDtrGroups(structured);
      } catch (err) {
        toast.error("Failed to fetch DTR records");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDtr();
  }, [employee, isOpen]);

  if (!isOpen || !employee) return null;

  return (
    <motion.div
      className="dtr-modal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="dtr-modal-content">
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

                const sample = rows[0];
                const dailyDates = sample.daily_data
                  ? Object.keys(sample.daily_data)
                  : [];

                const headers = [
                  { key: "full_name", label: "Full Name" },
                  { key: "employee_no", label: "Employee #" },
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
                          {rows.map((rec, rIdx) => (
                            <tr key={rIdx}>
                              <td>{rec.full_name}</td>
                              <td>{rec.employee_no}</td>
                              {dailyDates.map((d) => (
                                <td key={d}>{rec.daily_data[d] || ""}</td>
                              ))}
                              <td>{rec.total_days}</td>
                              <td>{rec.total_hours}</td>
                              <td>{rec.regular_ot}</td>
                              <td>{rec.legal_holiday}</td>
                              <td>{rec.unworked_reg_holiday}</td>
                              <td>{rec.special_holiday}</td>
                              <td>{rec.night_diff}</td>
                              <td>{rec.undertime_minutes}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
