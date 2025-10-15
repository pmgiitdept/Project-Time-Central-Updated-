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

// Format daily headers (Row 12 day + Row 13 date)
const formatDailyHeader = (dateStr) => {
  const date = new Date(dateStr);
  const day = date.toLocaleDateString("en-US", { weekday: "short" }); // Mon, Tue
  const d = date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit" }); // 09/30
  return `${day} ${d}`;
};

export default function EmployeeDtrModal({ 
  employee, 
  isOpen, 
  onClose,
  role = "viewer" // default, but can be passed from parent
}) {
  const [dtrGroups, setDtrGroups] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!employee || !isOpen) return;

    const fetchDtr = async () => {
      setLoading(true);
      try {
        console.log("Fetching DTR for:", employee.employee_code);

        const res = await api.get("/dtr/entries/employee/", {
          params: { employee_code: employee.employee_code }
        });

        console.log("Response:", res.data);
        setDtrGroups(res.data || []);
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
        <h2>DTR for {employee.employee_name}</h2>
        <button className="close-btn" onClick={onClose}>X</button>

        {loading ? (
          <p>Loading...</p>
        ) : (
          dtrGroups.map((group, idx) => {
            const rows = group.rows;
            if (!rows || rows.length === 0) return null;

            // extract headers dynamically from daily_data
            const sample = rows[0];
            const dailyDates = sample.daily_data ? Object.keys(sample.daily_data) : [];

            const headers = [
              { key: "full_name", label: "Full Name" },
              { key: "employee_no", label: "Employee #" },
              ...dailyDates.map(d => ({ key: d, label: formatDailyHeader(d) })),
              { key: "total_days", label: "Total Days" },
              { key: "total_hours", label: "Total Hours" },
              { key: "regular_ot", label: "OT" },
              { key: "legal_holiday", label: "Legal Holiday" },
              { key: "unworked_reg_holiday", label: "Unworked Reg Holiday" },
              { key: "special_holiday", label: "Special Holiday" },
              { key: "night_diff", label: "Night Diff" },
              { key: "undertime_minutes", label: "Undertime" }
            ];

            return (
              <div key={idx} className="dtr-table-wrapper">
                <h3>
                  Coverage: {formatDate(group.start_date)} → {formatDate(group.end_date)}
                </h3>
                <div className="dtr-scroll-container">
                  <table className="dtr-table">
                    <thead>
                      <tr>
                        {headers.map(col => (
                          <th key={col.key}>{col.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((rec, rIdx) => (
                        <tr key={rIdx}>
                          <td>{rec.full_name}</td>
                          <td>{rec.employee_no}</td>
                          {dailyDates.map(d => (
                            <td key={d}>
                              {rec.daily_data[d] || ""}
                            </td>
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
          })
        )}
      </div>
    </motion.div>
  );
}