/* components/DTRTableCompact.jsx */
import { useEffect, useState, useRef } from "react";
import api from "../api";
import { toast } from "react-toastify";
import "./styles/DTRTableCompact.css";

export default function DTRTableCompact({ fileId }) {
  const [fileContents, setFileContents] = useState([]);
  const [dateColumns, setDateColumns] = useState([]);
  const [selectedFileObj, setSelectedFileObj] = useState(null);
  const [dateCovered, setDateCovered] = useState({ start: null, end: null });

  const [hiddenColumns, setHiddenColumns] = useState(() => {
    const saved = localStorage.getItem("hiddenColumns");
    return saved ? JSON.parse(saved) : [];
  });

  const normalizeId = (id) => {
    if (id === undefined || id === null || id === "") return null;
    if (typeof id === "object") return id.id || null;
    return id.toString();
  };

  const handleViewFile = async (id = fileId) => {
    const normalizedId = normalizeId(id);
    if (!normalizedId) return;

    try {
        const res = await api.get(`/files/dtr/files/${normalizedId}/content/`);
        setFileContents(res.data.rows || []);
        if (res.data.rows?.length > 0) {
        setDateColumns(Object.keys(res.data.rows[0].daily_data || {}));
        }

        setSelectedFileObj(res.data.uploaded_by || {});
        setDateCovered({
        start: res.data.start_date || null,
        end: res.data.end_date || null,
        });
    } catch (err) {
        console.error(err);
        toast.error("Failed to load file content.");
    }
  };

  useEffect(() => {
    if (fileId) handleViewFile(fileId);
  }, [fileId]);

  const getDayNumber = (dateStr) => {
    const d = new Date(dateStr);
    return d.getDate();
  };

  const staticColumns = [
    { key: "full_name", label: "Full Name" },
    { key: "employee_no", label: "Emp #" },
    { key: "total_days", label: "Days" },
    { key: "total_hours", label: "Hours" },
  ];

  const extraColumns = [
    { key: "position", label: "Position" },
    { key: "shift", label: "Shift" },
    { key: "time", label: "Time" },
    { key: "regular_ot", label: "OT" },
    { key: "legal_holiday", label: "Legal Holiday" },
    { key: "unworked_reg_holiday", label: "Unworked Reg Holiday" },
    { key: "special_holiday", label: "Special Holiday" },
    { key: "night_diff", label: "Night Diff" },
    { key: "undertime_minutes", label: "Undertime" },
  ];

  const totalEmployees = (() => {
    const uniqueEmployees = new Set();
    fileContents.forEach((row) => {
      if (row?.employee_no) uniqueEmployees.add(row.employee_no.trim());
    });
    return uniqueEmployees.size;
  })();

  return (
    <div className="dtr-compact-wrapper">
      <h3 className="dtr-compact-title">
       Project: {selectedFileObj?.username || selectedFileObj?.full_name || "Unknown"} | Employees: {totalEmployees}
       </h3>
       {dateCovered.start && dateCovered.end && (
       <div className="dtr-compact-date">
        📅 Date Covered: {new Date(dateCovered.start).toLocaleDateString()} → {new Date(dateCovered.end).toLocaleDateString()}
       </div>
       )}

      <div className="dtr-compact-table-container">
        <table className="dtr-table dtr-compact">
          <thead>
            <tr>
                {staticColumns.map((col, idx) =>
                !hiddenColumns.includes(col.key) ? (
                    <th
                    key={col.key}
                    className={idx === 0 ? "sticky-col" : ""}
                    >
                    {col.label}
                    </th>
                ) : null
                )}
                {dateColumns.map((date) =>
                !hiddenColumns.includes(date) ? <th key={date}>{getDayNumber(date)}</th> : null
                )}
                {extraColumns.map((col) =>
                !hiddenColumns.includes(col.key) ? <th key={col.key}>{col.label}</th> : null
                )}
            </tr>
            </thead>

            <tbody>
            {fileContents.map((row, rIdx) => (
                <tr key={row?.id ?? `row-${rIdx}`}>
                {staticColumns.map((col, idx) =>
                    !hiddenColumns.includes(col.key) ? (
                    <td key={col.key} className={idx === 0 ? "sticky-col" : ""}>
                        {row[col.key] ?? "-"}
                    </td>
                    ) : null
                )}
                {dateColumns.map((date) =>
                    !hiddenColumns.includes(date) ? <td key={date}>{row.daily_data?.[date] ?? "-"}</td> : null
                )}
                {extraColumns.map((col) =>
                    !hiddenColumns.includes(col.key) ? <td key={col.key}>{row[col.key] ?? "-"}</td> : null
                )}
                </tr>
            ))}
            </tbody>
        </table>
      </div>
    </div>
  );
}