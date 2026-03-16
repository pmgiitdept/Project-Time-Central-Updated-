/* components/DTRTableCompact.jsx */
import { useEffect, useState } from "react";
import { useRef } from "react";
import api from "../api";
import { toast } from "react-toastify";
import "./styles/DTRTableCompact.css";

export default function DTRTableCompact({ fileId }) {

  const [fileContents, setFileContents] = useState([]);
  const [dateColumns, setDateColumns] = useState([]);
  const [selectedFileObj, setSelectedFileObj] = useState(null);

  const [editableRow, setEditableRow] = useState(null);
  const [saving, setSaving] = useState(false);
  const originalRowRef = useRef(null);

  const tableContainerRef = useRef(null);

  const [parsing, setParsing] = useState(false);

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
      setParsing(true);

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
    } finally {
      setParsing(false);
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

  const handleEditChange = (rowIndex, field, value, dateKey = null) => {
    setFileContents((prev) => {
      const updated = [...prev];
      const row = { ...updated[rowIndex] };

      if (dateKey) {
        row.daily_data = { ...row.daily_data, [dateKey]: value };
      } else {
        row[field] = value;
      }

      updated[rowIndex] = row;
      return updated;
    });
  };

  const startEdit = (rIdx) => {
    const scrollLeft = tableContainerRef.current?.scrollLeft || 0;

    originalRowRef.current = JSON.parse(
      JSON.stringify(fileContents[rIdx] || {})
    );

    setEditableRow(rIdx);

    requestAnimationFrame(() => {
      if (tableContainerRef.current) {
        tableContainerRef.current.scrollLeft = scrollLeft;
      }
    });
  };

  const cancelEdit = (rIdx) => {
    if (originalRowRef.current) {
      setFileContents((prev) => {
        const updated = [...prev];
        updated[rIdx] = originalRowRef.current;
        return updated;
      });
    }
    originalRowRef.current = null;
    setEditableRow(null);
  };

  const saveRow = async (rIdx) => {
    try {
      setSaving(true);
      const rowToSave = fileContents[rIdx];

      await api.post(`/files/dtr/files/${fileId}/update-rows/`, {
        rows: [rowToSave],
      });

      toast.success("Row updated successfully!");

      await handleViewFile(fileId);

      originalRowRef.current = null;
      setEditableRow(null);

    } catch (err) {
      console.error("Failed to save row:", err);
      toast.error("Failed to save row.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dtr-compact-wrapper">
      {!fileId ? (
        <p style={{ textAlign: "center", margin: "1rem", color: "#666" }}>
          Select a file above to view its DTR content.
        </p>
      ) : (
        <>
          <h3 className="dtr-compact-title">
            Project: {(() => {
              const uploader = selectedFileObj?.uploaded_by;
              if (!uploader) return "Unknown";
              if (typeof uploader === "string") return uploader; 
              if (uploader.full_name) return uploader.full_name;
              if (uploader.username) return uploader.username;
              return "Unknown";
            })()} | Employees: {totalEmployees}
          </h3>

          {selectedFileObj?.start_date && selectedFileObj?.end_date && (
            <div className="dtr-compact-date">
              📅 Date Covered: {new Date(selectedFileObj.start_date).toLocaleDateString()}
              {" → "}
              {new Date(selectedFileObj.end_date).toLocaleDateString()}
            </div>
          )}

          <div className="parse-section">
            <button
              className="parse-btn"
              onClick={handleParseAndDebug}
              disabled={parsing}
            >
              {parsing ? (
                <>
                  <span className="spinner"></span>
                  Parsing...
                </>
              ) : (
                "Parse & Compare"
              )}
            </button>

            <div className="parse-warning">
              <span className="warning-icon">⚠</span>
              <span>
                Parsing works correctly only if the PDF upload is from the biometric system.
                Files from other sources may cause mismatched or incorrect data.
              </span>
            </div>
          </div>

          {fileContents.length > 0 ? (
            <div
              className="dtr-compact-table-container"
              ref={tableContainerRef}
            >
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
                    <th>Edit</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedContents.map((row) => {
                    const rIdx = fileContents.findIndex(r => r.id === row.id);

                    return (
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
                            {col.key === "full_name" && (
                              <>
                                {row.status_flag === "mismatch" && (
                                  <span
                                    className="status-icon mismatch"
                                    title={row.mismatch_flag || "Mismatch detected"}
                                  >
                                    ⚠️
                                  </span>
                                )}

                                {row.status_flag === "match" && (
                                  <span className="status-icon match" title="Data matches payroll">
                                    ✅
                                  </span>
                                )}
                              </>
                            )}

                            {editableRow === rIdx ? (
                              <input
                                type="text"
                                value={row[col.key] ?? ""}
                                onChange={(e) =>
                                  handleEditChange(rIdx, col.key, e.target.value)
                                }
                                className="editable-input"
                              />
                            ) : (
                              formatCellValue(col.key, row[col.key])
                            )}
                          </td>
                        ))}

                        {dateColumns.map((date) => (
                          <td key={date}>
                            {editableRow === rIdx ? (
                              <input
                                type="text"
                                value={row.daily_data?.[date] ?? ""}
                                onChange={(e) =>
                                  handleEditChange(rIdx, "daily_data", e.target.value, date)
                                }
                                className="editable-input"
                              />
                            ) : (
                              formatCellValue(date, row.daily_data?.[date])
                            )}
                          </td>
                        ))}

                        <td>
                          {editableRow === rIdx ? (
                            <>
                              <button
                                className="btn-save"
                                onClick={() => saveRow(rIdx)}
                                disabled={saving}
                              >
                                {saving ? "Saving..." : "Save"}
                              </button>

                              <button
                                className="btn-cancel"
                                onClick={() => cancelEdit(rIdx)}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              className="btn-edit"
                              onClick={() => startEdit(rIdx)}
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ textAlign: "center", margin: "1rem", color: "#666" }}>
              No DTR data available for this file.
            </p>
          )}
        </>
      )}
    </div>
  );
}