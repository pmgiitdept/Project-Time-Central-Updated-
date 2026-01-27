/* ParsedDTRModal.jsx */
import React, { useState } from "react";
import "./styles/PDFModal.css"; // we can reuse same CSS
import api from "../api";

export default function ParsedDTRModal({ dtrData, currentUser, onClose }) {
  const [editableData, setEditableData] = useState(dtrData?.days || []);
  const [changes, setChanges] = useState({});
  const isAdmin = currentUser?.role === "admin";

  if (!dtrData) return null;

  const handleEditCell = (rowIdx, field, newValue) => {
    if (!isAdmin) return;

    setEditableData((prev) => {
      const updated = [...prev];
      updated[rowIdx] = { ...updated[rowIdx], [field]: newValue };
      return updated;
    });

    setChanges((prev) => ({
      ...prev,
      [rowIdx]: { ...prev[rowIdx], [field]: newValue },
    }));
  };

  const handleSave = async () => {
    if (!isAdmin) return alert("Only admins can save changes.");

    try {
      await api.put(`/files/parsed-dtrs/${dtrData.id}/`, {
        days: editableData,
        remarks: dtrData.remarks,
      });
      alert("✅ Changes saved successfully!");
    } catch (err) {
      console.error("Failed to save Parsed DTR:", err);
      alert("❌ Save failed. Check console for details.");
    }
  };

  return (
    <div className="pdf-card-container">
      <div className="pdf-card-header">
        <h3>
          {dtrData.employee_name} ({dtrData.employee_no})
        </h3>
        <p>Period: {dtrData.period_from} → {dtrData.period_to}</p>
        <p>Project: {dtrData.project || "N/A"} | Dept: {dtrData.department || "N/A"}</p>
        {isAdmin && (
          <div className="header-buttons">
            <button className="save-button" onClick={handleSave}>
              💾 Save Changes
            </button>
          </div>
        )}
        <button className="close-btn" onClick={onClose}>❌ Close</button>
      </div>

      <div className="pdf-card-body">
        {editableData.length === 0 ? (
          <p>No DTR data available.</p>
        ) : (
          <div className="table-container">
            <table className={`pdf-table ${isAdmin ? "editable-table" : ""}`}>
              <thead>
                <tr>
                  {Object.keys(editableData[0]).map((key, idx) => (
                    <th key={idx}>{key.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {editableData.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {Object.entries(row).map(([field, value], cIdx) => (
                      <td key={cIdx}>
                        {isAdmin ? (
                          <input
                            type="text"
                            value={value || ""}
                            onChange={(e) => handleEditCell(rIdx, field, e.target.value)}
                          />
                        ) : (
                          value
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {dtrData.totals && (
          <div className="totals-container">
            <h4>Totals</h4>
            <table className="pdf-table">
              <tbody>
                {Object.entries(dtrData.totals).map(([key, value]) => (
                  <tr key={key}>
                    <td><strong>{key}</strong></td>
                    <td>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {dtrData.remarks && (
          <div className="remarks-container">
            <strong>Remarks:</strong> {dtrData.remarks}
          </div>
        )}
      </div>
    </div>
  );
}
