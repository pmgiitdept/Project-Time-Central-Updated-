/* components/DTRTableCompact.jsx */
import { useEffect, useState, useRef } from "react";
import api from "../api";
import { toast } from "react-toastify";
import "./styles/DTRTableCompact.css";

export default function DTRTableCompact({ fileId }) {
  const [fileContents, setFileContents] = useState([]);
  const [dateColumns, setDateColumns] = useState([]);
  const [selectedFileObj, setSelectedFileObj] = useState(null);

  const sortedContents = [...fileContents].sort((a, b) => {
    const nameA = (a.full_name || "").toLowerCase();
    const nameB = (b.full_name || "").toLowerCase();
    return nameA.localeCompare(nameB);
  });

  const [hiddenColumns, setHiddenColumns] = useState(() => {
    const saved = localStorage.getItem("hiddenColumns");
    return saved ? JSON.parse(saved) : [];
  });

  const normalizeId = (id) => {
    if (!id) return null;
    return typeof id === "object" ? id.id || null : id.toString();
  };

  // --- Fetch DTR file content ---
  const handleViewFile = async (id = fileId) => {
    const normalizedId = normalizeId(id);
    if (!normalizedId) return;

    try {
      const res = await api.get(`/files/dtr/files/${normalizedId}/content/`);
      setFileContents(res.data.rows || []);
      if (res.data.rows?.length > 0) {
        setDateColumns(Object.keys(res.data.rows[0].daily_data || {}));
      }
      setSelectedFileObj(res.data || {});
    } catch (err) {
      console.error(err);
      toast.error("Failed to load file content.");
    }
  };

  // --- Trigger parse & compare with PDF ---
  const handleParseAndDebug = async () => {
    if (!fileId) return;

    try {
      const res = await api.post(`/dtr/files/${fileId}/parse/`);
      // log debug messages to console
      if (res.data.debug) {
        console.log("=== DTR Parse Debug ===");
        res.data.debug.forEach((msg) => console.log(msg));
        console.log("=== End Debug ===");
      }
      toast.success(res.data.message || "Parsed and compared successfully");

      // refresh table after parsing
      handleViewFile(fileId);
    } catch (err) {
      console.error(err);
      toast.error("Failed to parse DTR file.");
    }
  };

  useEffect(() => {
    if (fileId) handleViewFile(fileId);
  }, [fileId]);

  const getDayNumber = (dateStr) => new Date(dateStr).getDate();

  const staticColumns = [
    { key: "full_name", label: "Name" },
    { key: "employee_no", label: "Emp #" },
    { key: "total_days", label: "Days" },
    { key: "total_hours", label: "Hours" },
  ];

  const summaryColumns = [
    { key: "regular_ot", label: "OT" },
    { key: "legal_holiday", label: "LH" },
    { key: "special_holiday", label: "SH" },
    { key: "night_diff", label: "ND" },
    { key: "undertime_minutes", label: "UT" },
  ];

  const extraColumns = [
    { key: "position", label: "Position" },
    { key: "shift", label: "Shift" },
    { key: "time", label: "Time" },
    { key: "unworked_reg_holiday", label: "Unworked RH" },
  ];

  const integerColumns = new Set([
    "total_days", "total_hours", "regular_ot", "legal_holiday",
    "unworked_reg_holiday", "special_holiday", "night_diff", "undertime_minutes",
  ]);

  const formatCellValue = (colKey, value) => {
    if (integerColumns.has(colKey)) {
      const num = parseFloat(value);
      return Number.isNaN(num) ? "-" : Math.round(num);
    }
    return value ?? "-";
  };

  const totalEmployees = new Set(
    fileContents.map((row) => row?.employee_no?.trim()).filter(Boolean)
  ).size;

  return (
    <div className="dtr-compact-wrapper">
      <h3 className="dtr-compact-title">
        Project: {selectedFileObj?.uploaded_by?.username || selectedFileObj?.uploaded_by?.full_name || "Unknown"} | Employees: {totalEmployees}
      </h3>

      {selectedFileObj?.start_date && selectedFileObj?.end_date && (
        <div className="dtr-compact-date">
          📅 Date Covered: {new Date(selectedFileObj.start_date).toLocaleDateString()} → {new Date(selectedFileObj.end_date).toLocaleDateString()}
        </div>
      )}

      {/* --- Parse & Debug Button --- */}
      <div style={{ margin: "10px 0" }}>
        <button onClick={handleParseAndDebug}>Parse & Debug</button>
      </div>

      <div className="dtr-compact-table-container">
        <table className="dtr-table dtr-compact">
          <thead>
            <tr>
              {staticColumns.concat(summaryColumns, extraColumns).map((col, idx) =>
                !hiddenColumns.includes(col.key) ? (
                  <th key={col.key} className={idx === 0 ? "sticky-col" : ""}>{col.label}</th>
                ) : null
              )}
              {dateColumns.map((date) =>
                !hiddenColumns.includes(date) ? (
                  <th key={date}>{getDayNumber(date)}</th>
                ) : null
              )}
            </tr>
          </thead>

          <tbody>
            {sortedContents.map((row, rIdx) => (
              <tr
                key={row?.id ?? `row-${rIdx}`}
                className={
                  row.status_flag === "mismatch"
                    ? "mismatch-row"
                    : row.status_flag === "match"
                    ? "match-row"
                    : ""
                }
              >
                {staticColumns.concat(summaryColumns, extraColumns).map((col, idx) =>
                  !hiddenColumns.includes(col.key) ? (
                    <td key={col.key} className={idx === 0 ? "sticky-col" : ""}>
                      {col.key === "full_name" &&
                        (row.status_flag === "mismatch" ? "⚠️ " : row.status_flag === "match" ? "✅ " : "")
                      }
                      {formatCellValue(col.key, row[col.key])}
                    </td>
                  ) : null
                )}
                {dateColumns.map((date) =>
                  !hiddenColumns.includes(date) ? (
                    <td key={date}>{formatCellValue(date, row.daily_data?.[date])}</td>
                  ) : null
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}