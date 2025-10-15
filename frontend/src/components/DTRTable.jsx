/* components/DTRTable.jsx */
import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (!fileId) {
      const fetchDTRFiles = async () => {
        try {
          const res = await api.get("/dtr/files/");
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
      const res = await api.get(`/dtr/files/${fileId}/content/`);
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
      if (dateKey) {
        updated[rowIndex].daily_data = {
          ...updated[rowIndex].daily_data,
          [dateKey]: value,
        };
      } else {
        updated[rowIndex][field] = value;
      }
      return updated;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post(`/dtr/files/${selectedFile}/update-rows/`, {
        rows: fileContents,
      });
      toast.success("DTR updated successfully!");
      await handleViewFile(); 
    } catch (err) {
      toast.error("Failed to save changes.");
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
    { key: "full_name", label: "Full Name" },
    { key: "employee_no", label: "Employee #" },
  ];

  const extraColumns = [
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

  return (
    <div className="dtr-dashboard">
      <h2 className="dtr-title">
        Summary Forms - PROJECT: {selectedFileObj?.uploaded_by?.username || "Unknown"}
      </h2>

      {/* File Selector */}
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
      </div>

      {/* Hide Columns Button */}
      {selectedFile && fileContents.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <button
            className="view-btn"
            style={{ background: "#ff8800" }}
            onClick={() => setIsModalOpen(true)}
          >
            Hide Columns
          </button>
        </div>
      )}

      {/* File Content Table */}
      {fileContents.length > 0 && (
        <div className="dtr-file-content">
          <h3 className="content-title">Summary Forms</h3>
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
                </tr>
              </thead>
              <tbody>
                {fileContents.map((row, rIdx) => (
                  <tr key={row.id || rIdx}>
                    {!hiddenColumns.includes("full_name") && (
                      <td className="sticky-col sticky-1">
                        {role === "viewer" ? (
                          <input
                            type="text"
                            value={row.full_name}
                            onChange={(e) =>
                              handleEditChange(rIdx, "full_name", e.target.value)
                            }
                            className="editable-input"
                          />
                        ) : (
                          row.full_name
                        )}
                      </td>
                    )}

                    {!hiddenColumns.includes("employee_no") && (
                      <td className="sticky-col sticky-2">
                        {role === "viewer" ? (
                          <input
                            type="text"
                            value={row.employee_no}
                            onChange={(e) =>
                              handleEditChange(rIdx, "employee_no", e.target.value)
                            }
                            className="editable-input"
                          />
                        ) : (
                          row.employee_no
                        )}
                      </td>
                    )}

                    {dateColumns.map(
                      (date) =>
                        !hiddenColumns.includes(date) && (
                          <td key={date}>
                            {role === "viewer" ? (
                              <input
                                type="text"
                                value={row.daily_data?.[date] ?? ""}
                                onChange={(e) =>
                                  handleEditChange(
                                    rIdx,
                                    "daily_data",
                                    e.target.value,
                                    date
                                  )
                                }
                                className="editable-input"
                              />
                            ) : (
                              row.daily_data?.[date] ?? ""
                            )}
                          </td>
                        )
                    )}

                    {extraColumns.map(
                      (col) =>
                        !hiddenColumns.includes(col.key) && (
                          <td key={col.key}>
                            {role === "viewer" ? (
                              <input
                                type="text"
                                value={row[col.key] ?? ""}
                                onChange={(e) =>
                                  handleEditChange(
                                    rIdx,
                                    col.key,
                                    e.target.value
                                  )
                                }
                                className="editable-input"
                              />
                            ) : (
                              row[col.key]
                            )}
                          </td>
                        )
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Save Button for Viewer */}
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
              {[
                ...staticColumns,
                ...dateColumns.map((d) => ({ key: d, label: formatDate(d) })),
                ...extraColumns,
              ].map((col) => (
                <label
                  key={col.key}
                  style={{ display: "block", margin: "4px 0" }}
                >
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
              <button
                onClick={() => setHiddenColumns([])}
                className="reset-btn"
              >
                Reset Columns
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                className="view-btn"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}