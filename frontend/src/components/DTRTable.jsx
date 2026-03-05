/* components/DTRTable.jsx */
import { useEffect, useState, useRef } from "react";
import api from "../api";
import { toast } from "react-toastify";
import "./styles/DTRTable.css";

export default function DTRTable({ role , fileId}) {
  const [dtrFiles, setDtrFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [fileContents, setFileContents] = useState([]);
  const [dateColumns, setDateColumns] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [project, setProject] = useState("");
  const [hiddenColumns, setHiddenColumns] = useState(() => {
    const saved = localStorage.getItem("hiddenColumns");
    return saved ? JSON.parse(saved) : [];
  });
  const [saving, setSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");

  const [editableRow, setEditableRow] = useState(null); 
  const originalRowRef = useRef(null);

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  })();

  useEffect(() => {
    if (!fileId) {
      const fetchDTRFiles = async () => {
        try {
          const res = await api.get("/files/dtr/files/");
          setDtrFiles(res.data.results || res.data);
        } catch (err) {
          console.error("Failed to fetch DTR files:", err);
        }
      };
      fetchDTRFiles();
    }
  }, [fileId]);

  const normalizeId = (id) => {
    if (id === undefined || id === null || id === "") return null;
    if (typeof id === "object") return id.id || null;
    return id.toString();
  };

  useEffect(() => {
    const id = normalizeId(fileId);
    if (id) {
      handleViewFile(id);
      setSelectedFile(id.toString());
    }
  }, [fileId]);

  useEffect(() => {
    localStorage.setItem("hiddenColumns", JSON.stringify(hiddenColumns));
  }, [hiddenColumns]);

  const [selectedFileObj, setSelectedFileObj] = useState(null);

  useEffect(() => {
    if (!fileId || dtrFiles.length === 0) return;

    const file = dtrFiles.find(f => f.id.toString() === fileId.toString());
    if (file) {
      setSelectedFileObj(file);
      setSelectedFile(file.id.toString());
      handleViewFile(file.id);
    }
  }, [fileId, dtrFiles]);

  const handleViewFile = async (id = selectedFile) => {
    const fileId = normalizeId(id);
    if (!fileId) {
      toast.warn("Please select a file first!");
      return;
    }

    try {
      const res = await api.get(`/files/dtr/files/${fileId}/content/`);
      setFileContents(res.data.rows || []);

      if (res.data.rows?.length > 0) {
        const sample = res.data.rows[0].daily_data || {};
        setDateColumns(Object.keys(sample));
      }

      setProject(res.data.uploaded_by?.username || res.data.uploaded_by?.username || "Unknown");
    } catch (err) {
      toast.error("Failed to load file content.");
    }
  };

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

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post(`/files/dtr/files/${selectedFile}/update-rows/`, { rows: fileContents });
      toast.success("DTR updated successfully!");
      await handleViewFile();

      await api.post(`/files/dtr/files/${selectedFile}/log-update/`, {
        message: `Updated entire DTR file (${fileContents.length} rows)`,
      });

    } catch (err) {
      toast.error("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (rIdx) => {
    originalRowRef.current = JSON.parse(JSON.stringify(fileContents[rIdx] || {}));
    setEditableRow(rIdx);
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

      await api.post(`/files/dtr/files/${selectedFile}/update-rows/`, { rows: [rowToSave] });
      toast.success("Row updated successfully!");
      await handleViewFile(selectedFile);

      await api.post(`/files/dtr/files/${selectedFile}/log-update/`, {
        message: `Updated DTR row id=${rowToSave.id} (${rowToSave.full_name})`,
      });

      originalRowRef.current = null;
      setEditableRow(null);
    } catch (err) {
      console.error("Failed to save row:", err);
      toast.error("Failed to save row.");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "2-digit",
    });
  };

  const toggleColumn = (col) => {
    setHiddenColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

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

  const canEditRow = currentUser?.username === "operations.pmgi" || currentUser?.username === "operations.hk" || currentUser?.username === "operations.gl";

  const [isFullTableOpen, setIsFullTableOpen] = useState(false);

  const filteredContents = fileContents.filter((row) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();

    const fieldsToCheck = [
      row.full_name,
      row.employee_no,
      row.position,
      row.shift,
      row.total_hours,
      row.regular_ot,
    ];

    if (row.daily_data) {
      fieldsToCheck.push(...Object.values(row.daily_data));
    }

    return fieldsToCheck.some(
      (val) => val && val.toString().toLowerCase().includes(term)
    );
  });
  
  const totalEmployees = (() => {
    const uniqueEmployees = new Set();

    fileContents.forEach((row) => {
      if (row?.employee_no) {
        uniqueEmployees.add(row.employee_no.trim());
      }
    });

    return uniqueEmployees.size;
  })();

  return (
    <div className="dtr-dashboard">
      <h2 className="dtr-title">
        Summary Forms - PROJECT: {selectedFileObj?.uploaded_by?.username || "Unknown"}
      </h2>

      {selectedFileObj && (
        <div className="date-covered">
          📅 Date Covered:{" "}
          <strong>
            {selectedFileObj.start_date
              ? new Date(selectedFileObj.start_date).toLocaleDateString()
              : "N/A"}
            {"  →  "}
            {selectedFileObj.end_date
              ? new Date(selectedFileObj.end_date).toLocaleDateString()
              : "N/A"}
          </strong>
        </div>
      )}

      {selectedFile && fileContents.length > 0 && (
        <div className="table-controls">
          <button
            className="view-btn hide-columns-btn"
            onClick={() => setIsModalOpen(true)}
          >
            Hide Columns
          </button>

          <button
            className="view-btn view-full-btn"
            onClick={() => setIsFullTableOpen(true)}
          >
            View Full Table
          </button>
        </div>
      )}

      {fileContents.length > 0 && (
        <div className="dtr-file-content">
          <h3 className="content-title">
            <span style={{ marginLeft: "12px", fontSize: "16px", fontWeight: "normal" }}>
              👥 Total Employees: <strong>{totalEmployees}</strong>
            </span>
          </h3>

          <div className="table-container">
            <table className="dtr-table">
              <thead>
                <tr>
                  {staticColumns.map(
                    (col, idx) =>
                      !hiddenColumns.includes(col.key) && (
                        <th
                          key={col.key}
                          className={`sticky-col sticky-${idx + 1}`}
                        >
                          {col.label}
                        </th>
                      )
                  )}
                  {dateColumns.map(
                    (date) =>
                      !hiddenColumns.includes(date) && (
                        <th key={date} className="date-col">
                          {getDayNumber(date)}
                        </th>
                      )
                  )}
                  {extraColumns.map(
                    (col) =>
                      !hiddenColumns.includes(col.key) && (
                        <th key={col.key}>{col.label}</th>
                      )
                  )}
                  {canEditRow && <th>Edit</th>}
                </tr>
              </thead>
              <tbody>
                {filteredContents
                  ?.filter((row) => row) 
                  .map((row, rIdx) => (
                    <tr key={row?.id ?? `row-${rIdx}`}>
                      {staticColumns.map(
  (col, idx) =>
    !hiddenColumns.includes(col.key) && (
      <td
        key={col.key}
        className={idx === 0 ? "sticky-col sticky-1" : ""}
      >
        {editableRow === rIdx ? (
          <input
            type="text"
            value={row?.[col.key] ?? ""}
            onChange={(e) =>
              handleEditChange(rIdx, col.key, e.target.value)
            }
            className="editable-input"
          />
        ) : (
          row?.[col.key] ?? "-"
        )}
      </td>
    )
)}

                      {dateColumns.map(
                        (date) =>
                          !hiddenColumns.includes(date) && (
                            <td key={date}>
                              {editableRow === rIdx ? (
                                <input
                                  type="text"
                                  value={row?.daily_data?.[date] ?? ""}
                                  onChange={(e) =>
                                    handleEditChange(rIdx, "daily_data", e.target.value, date)
                                  }
                                  className="editable-input"
                                />
                              ) : (
                                row?.daily_data?.[date] ?? "-"
                              )}
                            </td>
                          )
                      )}

                      {extraColumns.map(
                        (col) =>
                          !hiddenColumns.includes(col.key) && (
                            <td key={col.key}>
                              {editableRow === rIdx ? (
                                <input
                                  type="text"
                                  value={row?.[col.key] ?? ""}
                                  onChange={(e) =>
                                    handleEditChange(rIdx, col.key, e.target.value)
                                  }
                                  className="editable-input"
                                />
                              ) : (
                                row?.[col.key] ?? "-"
                              )}
                            </td>
                          )
                      )}

                      {canEditRow && (
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
                            </>
                          ) : (
                            <button className="btn-edit" onClick={() => startEdit(rIdx)}>
                              Edit
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {role === "viewer" && (
            <button
              className="save-btn"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "⏳ Saving..." : "💾 Save Changes"}
            </button>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay1">
          <div className="modal-content1">
            <h3>Select Columns to Hide</h3>
            <div className="modal-columns">
              {[ ...staticColumns, ...dateColumns.map((d) => ({ key: d, label: formatDate(d) })), ...extraColumns ].map((col) => (
                <label key={col.key} style={{ display: "block", margin: "4px 0" }}>
                  <input
                    type="checkbox"
                    checked={hiddenColumns.includes(col.key)}
                    onChange={() => toggleColumn(col.key)}
                  />
                  {col.label}
                </label>
              ))}
            </div>
            <div className="modal-actions">
              <button onClick={() => setHiddenColumns([])} className="reset-btn">Reset Columns</button>
              <button onClick={() => setIsModalOpen(false)} className="view-btn">Close</button>
            </div>
          </div>
        </div>
      )}

      {isFullTableOpen && (
        <div className="modal-overlay1">
          <div className="modal-content2 large-modal">
            <div className="modal-header">
              <h3>📋 Attendance Summary Form - Record</h3>
              <button
                className="close-btn"
                onClick={() => setIsFullTableOpen(false)}
              >
                ✖
              </button>
            </div>
            <div className="dtr-info-bar">
              <div className="info-section">
                <div className="info-item">
                  <strong>Project:</strong>
                  <span>{selectedFileObj?.uploaded_by?.full_name || selectedFileObj?.uploaded_by?.username || "Unknown"}</span>
                </div>
                <div className="info-item">
                  <strong>Start Date:</strong>
                  <span>{selectedFileObj?.start_date ? new Date(selectedFileObj.start_date).toLocaleDateString() : "N/A"}</span>
                </div>
                <div className="info-item">
                  <strong>End Date:</strong>
                  <span>{selectedFileObj?.end_date ? new Date(selectedFileObj.end_date).toLocaleDateString() : "N/A"}</span>
                </div>
                <div className="info-item">
                  <strong>Total Employees:</strong>
                  <span>{totalEmployees}</span>
                </div>
              </div>

              <div className={`status-badge status-${selectedFileObj?.status || "pending"}`}>
                {selectedFileObj?.status ? selectedFileObj.status.toUpperCase() : "PENDING"}
              </div>
            </div>

            <div className="search-bar">
              <input
                type="text"
                placeholder="Search employee, position, or date..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="clear-btn">✖</button>
              )}
            </div>

            <div className="full-table-container">
              <table className="dtr-table full-view">
                <thead>
                  <tr>
                    {staticColumns.map(
                      (col) =>
                        !hiddenColumns.includes(col.key) && (
                          <th key={col.key}>{col.label}</th>
                        )
                    )}
                    {dateColumns.map(
                      (date) =>
                        !hiddenColumns.includes(date) && (
                          <th key={date}>{formatDate(date)}</th>
                        )
                    )}
                    {extraColumns.map(
                      (col) =>
                        !hiddenColumns.includes(col.key) && (
                          <th key={col.key}>{col.label}</th>
                        )
                    )}

                    {canEditRow && <th className="edit-column">Edit</th>}
                  </tr>
                </thead>

                <tbody>
                  {filteredContents.map((row, rIdx) => (
                    <tr key={rIdx}>
                      {staticColumns.map(
                        (col) =>
                          !hiddenColumns.includes(col.key) && (
                            <td key={col.key}>
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
                                row[col.key]
                              )}
                            </td>
                          )
                      )}

                      {dateColumns.map(
                        (date) =>
                          !hiddenColumns.includes(date) && (
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
                                row.daily_data?.[date] ?? "-"
                              )}
                            </td>
                          )
                      )}

                      {extraColumns.map(
                        (col) =>
                          !hiddenColumns.includes(col.key) && (
                            <td key={col.key}>
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
                                row[col.key]
                              )}
                            </td>
                          )
                      )}

                      {canEditRow && (
                        <td className="edit-column">
                          {editableRow === rIdx ? (
                            <>
                              <button
                                className="btn-save"
                                onClick={() => saveRow(rIdx)}
                                disabled={saving}
                              >
                                {saving ? "Saving..." : "Save"}
                              </button>
                            </>
                          ) : (
                            <button className="btn-edit" onClick={() => startEdit(rIdx)}>
                              Edit
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
