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

  // New: editing states
  const [editableRow, setEditableRow] = useState(null); // index of row being edited
  const originalRowRef = useRef(null);

  // Get currentUser from localStorage (or pass it as prop if you prefer)
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

  // Save all rows (existing behavior)
  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post(`/files/dtr/files/${selectedFile}/update-rows/`, { rows: fileContents });
      toast.success("DTR updated successfully!");
      await handleViewFile();
    } catch (err) {
      toast.error("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  // New: start editing a single row
  const startEdit = (rIdx) => {
    originalRowRef.current = JSON.parse(JSON.stringify(fileContents[rIdx] || {}));
    setEditableRow(rIdx);
  };

  // New: cancel editing, restore original
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

  // New: save only this row
  const saveRow = async (rIdx) => {
    try {
      setSaving(true);
      const rowToSave = fileContents[rIdx];
      // API expects { rows: [...] } — send single row
      await api.post(`/files/dtr/files/${selectedFile}/update-rows/`, { rows: [rowToSave] });
      toast.success("Row updated successfully!");
      // refresh list / content
      await handleViewFile(selectedFile);
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

  const staticColumns = [
    { key: "full_name", label: "Full Name" }
  ];

  const extraColumns = [
    { key: "employee_no", label: "Employee #" },
    { key: "position", label: "Position" },
    { key: "shift", label: "Shift" },
    { key: "time", label: "Time" },
    { key: "total_days", label: "Total Days" },
    { key: "total_hours", label: "Total Hours" },
    { key: "regular_ot", label: "OT" },
    { key: "legal_holiday", label: "Legal Holiday" },
    { key: "unworked_reg_holiday", label: "Unworked Reg Holiday" },
    { key: "special_holiday", label: "Special Holiday" },
    { key: "night_diff", label: "Night Diff" },
    { key: "undertime_minutes", label: "Undertime" },
  ];

  // Only show Edit column for this username
  const canEditRow = currentUser?.username === "operations.pmgi" || currentUser?.username === "operations.hk" || currentUser?.username === "operations.gl";
    // Add this new state near your other modals:
  const [isFullTableOpen, setIsFullTableOpen] = useState(false);

  // 🔍 Filter fileContents by searchTerm
  const filteredContents = fileContents.filter((row) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();

    // Convert row fields to searchable strings
    const fieldsToCheck = [
      row.full_name,
      row.employee_no,
      row.position,
      row.shift,
      row.total_hours,
      row.regular_ot,
    ];

    // Include all daily_data values
    if (row.daily_data) {
      fieldsToCheck.push(...Object.values(row.daily_data));
    }

    // Match if any field contains the term
    return fieldsToCheck.some(
      (val) => val && val.toString().toLowerCase().includes(term)
    );
  });


  return (
    <div className="dtr-dashboard">
      <h2 className="dtr-title">
        Summary Forms - PROJECT: {selectedFileObj?.uploaded_by?.username || "Unknown"}
      </h2>

      {/* File Selector 
      <div className="file-selector">
        <label htmlFor="fileDropdown" className="file-label">
          Choose a DTR File:
        </label>
        <div className="file-actions">
          <select
            id="fileDropdown"
            value={selectedFile}
            onChange={(e) => {
              const id = e.target.value;
              setSelectedFile(id);
              handleViewFile(id);
            }}
            className="file-dropdown"
          >
            <option value="">-- Select a file --</option>
            {dtrFiles.map((file) => (
              <option key={file.id} value={file.id}>
                {file.filename} ({formatDate(file.start_date)} → {formatDate(file.end_date)})
              </option>
            ))}
          </select>
        </div>
      </div> */}

      {/* Table Controls: Hide Columns + View Full Table */}
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

      {/* File Content Table */}
      {fileContents.length > 0 && (
        <div className="dtr-file-content">
          <h3 className="content-title">Summary Forms</h3>

          {/* 🔍 Search Bar 
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
          </div> */}

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
                        <th key={date}>{formatDate(date)}</th>
                      )
                  )}
                  {extraColumns.map(
                    (col) =>
                      !hiddenColumns.includes(col.key) && (
                        <th key={col.key}>{col.label}</th>
                      )
                  )}
                  {/* Edit column header */}
                  {canEditRow && <th>Edit</th>}
                </tr>
              </thead>
              <tbody>
                {filteredContents
                  ?.filter((row) => row) // Skip null or undefined rows
                  .map((row, rIdx) => (
                    <tr key={row?.id ?? `row-${rIdx}`}>
                      {/* Full Name - Sticky Col */}
                      {!hiddenColumns.includes("full_name") && (
                        <td className="sticky-col sticky-1">
                          {editableRow === rIdx ? (
                            <input
                              type="text"
                              value={row?.full_name ?? ""}
                              onChange={(e) =>
                                handleEditChange(rIdx, "full_name", e.target.value)
                              }
                              className="editable-input"
                            />
                          ) : (
                            row?.full_name ?? "-"
                          )}
                        </td>
                      )}

                      {/* Employee # - Sticky Col */}
                      {!hiddenColumns.includes("employee_no") && (
                        <td>
                          {editableRow === rIdx ? (
                            <input
                              type="text"
                              value={row?.employee_no ?? ""}
                              onChange={(e) =>
                                handleEditChange(rIdx, "employee_no", e.target.value)
                              }
                              className="editable-input"
                            />
                          ) : (
                            row?.employee_no ?? "-"
                          )}
                        </td>
                      )}

                      {/* Daily Data Columns */}
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

                      {/* Extra Columns */}
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

                      {/* Edit Column */}
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

          {/* Save Button for Viewer (keeps existing behavior) */}
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

      {/* Modal for Hide Columns */}
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

      {/* Full Table Modal */}
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
           {/* File details summary */}
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
              </div>

              <div className={`status-badge status-${selectedFileObj?.status || "pending"}`}>
                {selectedFileObj?.status ? selectedFileObj.status.toUpperCase() : "PENDING"}
              </div>
            </div>

            {/* 🔍 Search Bar */}
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

                    {/* ✅ New: Edit column header */}
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

                      {/* ✅ New: Edit buttons (only for operations.pmgi) */}
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
