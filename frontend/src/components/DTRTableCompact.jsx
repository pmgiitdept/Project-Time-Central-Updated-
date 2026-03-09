/* components/DTRTableCompact.jsx */

import { useEffect, useState } from "react";
import api from "../api";
import { toast } from "react-toastify";
import "./styles/DTRTableCompact.css";

export default function DTRTableCompact({ fileId }) {

  const [fileContents, setFileContents] = useState([]);
  const [dateColumns, setDateColumns] = useState([]);
  const [selectedFileObj, setSelectedFileObj] = useState(null);

  const normalizeEmpNo = (empNo) => {
    if (!empNo) return "";
    const digits = empNo.toString().replace(/\D/g, "");
    return digits.padStart(5, "0");
  };

  const normalizeId = (id) => {
    if (!id) return null;
    return typeof id === "object" ? id.id || null : id.toString();
  };

  const sortedContents = [...fileContents].sort((a, b) => {
    const nameA = (a.full_name || "").toLowerCase();
    const nameB = (b.full_name || "").toLowerCase();
    return nameA.localeCompare(nameB);
  });

  const handleViewFile = async (id = fileId) => {
    const normalizedId = normalizeId(id);
    if (!normalizedId) return;

    try {
      const res = await api.get(`/files/dtr/files/${normalizedId}/content/`);

      const rows = res.data.rows || [];

      console.log("=== DTR RAW DATA ===");
      console.log(rows);

      const normalizedRows = rows.map((r) => {
        const normalizedEmp = normalizeEmpNo(r.employee_no);

        console.log("Employee Row Loaded");
        console.log({
          name: r.full_name,
          employee_no_original: r.employee_no,
          employee_no_normalized: normalizedEmp,
          total_days: r.total_days,
          total_hours: r.total_hours,
          regular_ot: r.regular_ot,
          night_diff: r.night_diff,
          mismatch_flag: r.mismatch_flag,
          status_flag: r.status_flag,
        });

        return {
          ...r,
          employee_no: normalizedEmp,
          daily_data: r.daily_data || {},
        };
      });

      setFileContents(normalizedRows);

      if (normalizedRows.length > 0) {
        setDateColumns(Object.keys(normalizedRows[0].daily_data || {}));
      }

      setSelectedFileObj(res.data || {});
      return res.data; 

    } catch (err) {
      console.error("DTR Load Error", err);
      toast.error("Failed to load file content.");
    }
  };

  const handleParseAndDebug = async () => {
    if (!fileId) return;

    try {
      console.log("=== STARTING PARSE ===");

      const res = await api.post(`/files/dtr/files/${fileId}/parse/`);

      if (res.data.debug) {
        console.log("===== BACKEND PARSER DEBUG =====");
        res.data.debug.forEach((msg) => console.log(msg));
        console.log("===== END PARSER DEBUG =====");
      }

      toast.success(res.data.message || "Parsed and compared successfully");

      const updatedFile = await handleViewFile(fileId);

      if (updatedFile?.rows) {
        updatedFile.rows.forEach((row) => {
          console.log("=== Employee Debug ===");
          console.log({
            name: row.full_name,
            employee_no_original: row.employee_no,
            employee_no_normalized: normalizeEmpNo(row.employee_no),
            total_days: row.total_days,
            total_hours: row.total_hours,
            regular_ot: row.regular_ot,
            night_diff: row.night_diff,
            mismatch_flag: row.mismatch_flag,
            status_flag: row.status_flag,
          });
        });
      }

      console.log("=== PARSE COMPLETE ===");

    } catch (err) {
      console.error("Parse Error", err);
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
    "total_days",
    "total_hours",
    "regular_ot",
    "legal_holiday",
    "unworked_reg_holiday",
    "special_holiday",
    "night_diff",
    "undertime_minutes",
  ]);

  const formatCellValue = (colKey, value) => {

    if (integerColumns.has(colKey)) {

      const num = parseFloat(value);

      return Number.isNaN(num) ? "-" : Math.round(num);

    }

    return value ?? "-";

  };

  const totalEmployees = new Set(
    fileContents.map((row) => normalizeEmpNo(row?.employee_no)).filter(Boolean)
  ).size;

  return (
    <div className="dtr-compact-wrapper">

      <h3 className="dtr-compact-title">
        Project: {selectedFileObj?.uploaded_by?.username ||
          selectedFileObj?.uploaded_by?.full_name ||
          "Unknown"} | Employees: {totalEmployees}
      </h3>

      {selectedFileObj?.start_date && selectedFileObj?.end_date && (
        <div className="dtr-compact-date">
          📅 Date Covered: {new Date(selectedFileObj.start_date).toLocaleDateString()}
          {" → "}
          {new Date(selectedFileObj.end_date).toLocaleDateString()}
        </div>
      )}

      <div style={{ margin: "10px 0" }}>
        <button onClick={handleParseAndDebug}>
          Parse & Compare
        </button>
      </div>

      <div className="dtr-compact-table-container">
        <table className="dtr-table dtr-compact">
          <thead>
            <tr>
              {staticColumns.concat(summaryColumns, extraColumns).map((col, idx) => (
                <th key={col.key} className={idx === 0 ? "sticky-col" : ""}>
                  {col.label}
                </th>
              ))}
              {dateColumns.map((date) => (
                <th key={date}>
                  {getDayNumber(date)}
                </th>
              ))}
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
                {staticColumns.concat(summaryColumns, extraColumns).map((col, idx) => (
                  <td key={col.key} className={idx === 0 ? "sticky-col" : ""}>
                    {col.key === "full_name" ? (
  <div className="employee-name-cell">
    <div className="employee-name-main">
      {row.status_flag === "mismatch" && (
        <div className="status-icon-wrapper">
          <span className="status-icon mismatch">⚠️</span>
          {row.mismatch_flag && (
            <div className="floating-mismatch">
              {row.mismatch_flag}
            </div>
          )}
        </div>
      )}

      {row.status_flag === "match" && (
        <span className="status-icon match" title="Data matches payroll">
          ✅
        </span>
      )}

      <span>{row.full_name}</span>
    </div>
  </div>
) : (
  formatCellValue(col.key, row[col.key])
)}
                  </td>
                ))}
                {dateColumns.map((date) => (
                  <td key={date}>
                    {formatCellValue(date, row.daily_data?.[date])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}