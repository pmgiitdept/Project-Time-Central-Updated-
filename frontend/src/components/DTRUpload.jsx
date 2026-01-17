// components/DTRUpload.jsx
import { useState, useRef, useMemo } from "react";
import api from "../api";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import "./styles/ClientDashboard.css";

function getDTRCutoffStatus() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const year = today.getFullYear();
  const month = today.getMonth();

  // 15th cutoff → valid until 20
  const cutoff15Start = new Date(year, month, 15);
  const cutoff15End = new Date(year, month, 20);

  // 30th cutoff → valid for 5 days (spills to next month)
  const cutoff30Start = new Date(year, month, 30);
  const cutoff30End = new Date(cutoff30Start);
  cutoff30End.setDate(cutoff30End.getDate() + 5);

  // Previous month 30th cutoff (for early month dates like Jan 2–4)
  const prev30Start = new Date(year, month - 1, 30);
  const prev30End = new Date(prev30Start);
  prev30End.setDate(prev30End.getDate() + 5);

  const canSubmit =
    (today >= cutoff15Start && today <= cutoff15End) ||
    (today >= cutoff30Start && today <= cutoff30End) ||
    (today >= prev30Start && today <= prev30End);

  let message = "Unavailable – wait for next cutoff";

  if (today >= cutoff15Start && today <= cutoff15End) {
    message = `Submission available until ${cutoff15End.toLocaleDateString()}`;
  } else if (today >= cutoff30Start && today <= cutoff30End) {
    message = `Submission available until ${cutoff30End.toLocaleDateString()}`;
  } else if (today >= prev30Start && today <= prev30End) {
    message = `Submission available until ${prev30End.toLocaleDateString()}`;
  }

  return { canSubmit, message };
}

export default function DTRUpload({ refreshDTR }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const fileInputRef = useRef(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  /* ======== Cutoff Logic ======== */
  const { canSubmit, message } = getDTRCutoffStatus();

  /* ================= Excel Upload ================= */
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!canSubmit) return toast.error("DTR upload is unavailable at this time.");

    if (!file) return toast.error("Select an Excel file first.");
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      return toast.error("Please upload a valid Excel file.");
    }

    setUploading(true);
    const token = localStorage.getItem("access_token");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("/files/dtr/files/", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      await api.post(`/files/dtr/files/${res.data.id}/parse/`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("DTR file uploaded successfully!");
      setHasSubmitted(true);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = null;
      refreshDTR();
    } catch (err) {
      console.error(err);
      toast.error("DTR upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <motion.div className="upload-card" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="upload-title">Upload Summary Form</h2>
        <p style={{ fontSize: "0.9rem", color: canSubmit ? "green" : "red" }}>{message}</p>

        <form onSubmit={handleUpload} className="upload-form">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => setFile(e.target.files[0])}
            className="file-input"
          />
          <button
            type="submit"
            disabled={uploading || !canSubmit || hasSubmitted}
            className="upload-button"
          >
            {hasSubmitted
              ? "DTR Already Submitted"
              : uploading
              ? "Uploading..."
              : "Upload Excel Form"}
          </button>
        </form>

        {file && <p className="selected-file">📊 {file.name}</p>}

        <button
          type="button"
          className="upload-button1 secondary"
          onClick={() => setShowManual(true)}
          disabled={!canSubmit || hasSubmitted}
        >
          {hasSubmitted
            ? "DTR Already Submitted"
            : canSubmit
            ? "Enter DTR Manually"
            : "Unavailable – wait for next cutoff"}
        </button>
      </motion.div>

      <AnimatePresence>
        {showManual && (
          <ManualDTRCard
            onClose={() => setShowManual(false)}
            onSuccess={() => {
              setHasSubmitted(true); // 🔒 lock submission
              refreshDTR();          // 🔄 refresh list
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ================= Manual Card Form ================= */

function ManualDTRCard({ onClose, onSuccess }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rows, setRows] = useState([
    {
      full_name: "",
      employee_no: "",
      position: "",
      shift: "",
      time: "",
      total_hours: "",
      undertime_minutes: "",
      regular_ot: "",
      legal_holiday: "",
      unworked_reg_holiday: "",
      special_holiday: "",
      night_diff: "",
      daily_data: {},
    },
  ]);

  const STANDARD_HOURS = 8;

  function computeTotals(dailyData) {
    let totalHours = 0;
    let regularOT = 0;

    Object.values(dailyData).forEach((val) => {
      const hours = parseFloat(val);

      // Ignore non-numeric inputs
      if (isNaN(hours)) return;

      totalHours += hours;

      if (hours > STANDARD_HOURS) {
        regularOT += hours - STANDARD_HOURS;
      }
    });

    return {
      total_hours: totalHours,
      regular_ot: regularOT,
    };
  }

  /* ======== Cutoff Logic for Date Inputs ======== */  
  const { canSubmit, message } = getDTRCutoffStatus();

  const formatDate = (d) => d.toISOString().split("T")[0];

  /* ===== Date helpers ===== */
  const dateList = useMemo(() => {
    if (!startDate || !endDate) return [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return [];

    const dates = [];
    const d = new Date(start);
    while (d <= end) {
      dates.push(d.toISOString().split("T")[0]);
      d.setDate(d.getDate() + 1);
    }
    return dates;
  }, [startDate, endDate]);

  const totalDays = dateList.length;

  const updateRow = (index, field, value) => {
    const updated = [...rows];
    updated[index][field] = value;
    setRows(updated);
  };

  const updateDaily = (rowIndex, date, value) => {
    const updated = [...rows];

    // Update daily value
    const newDailyData = {
      ...updated[rowIndex].daily_data,
      [date]: value,
    };

    // Recompute totals
    const { total_hours, regular_ot } = computeTotals(newDailyData);

    updated[rowIndex] = {
      ...updated[rowIndex],
      daily_data: newDailyData,
      total_hours,
      regular_ot,
    };

    setRows(updated);
  };

  const addRow = () => {
    setRows([
      ...rows,
      {
        full_name: "",
        employee_no: "",
        position: "",
        shift: "",
        time: "",
        total_hours: "",
        undertime_minutes: "",
        regular_ot: "",
        legal_holiday: "",
        unworked_reg_holiday: "",
        special_holiday: "",
        night_diff: "",
        daily_data: {},
      },
    ]);
  };

  const submitManual = async () => {
    if (!startDate || !endDate) return toast.error("Start and end dates are required.");
    if (!totalDays) return toast.error("Invalid date range.");
    if (!canSubmit) {
      return toast.error("Manual DTR submission unavailable outside cutoff window.");
    }

    const token = localStorage.getItem("access_token");

    try {
      await api.post(
        "/files/dtr/files/manual/",
        {
          start_date: startDate,
          end_date: endDate,
          rows: rows.map((r) => ({
            ...r,
            total_days: totalDays,
            total_hours: r.total_hours || 0,
            undertime_minutes: r.undertime_minutes || 0,
            regular_ot: r.regular_ot || 0,
            legal_holiday: r.legal_holiday || 0,
            unworked_reg_holiday: r.unworked_reg_holiday || 0,
            special_holiday: r.special_holiday || 0,
            night_diff: r.night_diff || 0,
          })),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Manual DTR created successfully!");
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit manual DTR.");
    }
  };

  return (
    <motion.div className="manual-card-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="manual-card" initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
        <h3>Manual DTR Entry</h3>

        {!canSubmit ? (
          <p style={{ color: "red" }}>Manual DTR submission is unavailable outside cutoff window.</p>
        ) : (
          <>
          <div className="manual-section">
            <h4>Date Range</h4>
              <div className="manual-dates">
                <input
                  type="date"  
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
                <input type="number" readOnly value={totalDays} placeholder="Total Days" />
              </div>
          </div>

            {rows.map((row, i) => (
              <div key={i} className="manual-row-block">
                <div className="manual-section">
                  <h5>Employee Details</h5>
                  <div className="manual-row-grid">
                    <input placeholder="Full Name" value={row.full_name} onChange={(e) => updateRow(i, "full_name", e.target.value)} />
                    <input placeholder="Employee No" value={row.employee_no} onChange={(e) => updateRow(i, "employee_no", e.target.value)} />
                    <input placeholder="Position" value={row.position} onChange={(e) => updateRow(i, "position", e.target.value)} />
                    <input placeholder="Shift" value={row.shift} onChange={(e) => updateRow(i, "shift", e.target.value)} />
                    <input placeholder="Time" value={row.time} onChange={(e) => updateRow(i, "time", e.target.value)} />
                  </div>
                </div>

                {dateList.length > 0 && (
                  <div className="manual-section">
                    <h5>Daily Time Entries</h5>
                    <div className="daily-grid">
                      {dateList.map((d) => (
                        <input
                          key={d}
                          placeholder={d}
                          value={row.daily_data[d] || ""}
                          onChange={(e) => updateDaily(i, d, e.target.value)}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div className="manual-section">
                  <h5>Totals & Adjustments</h5>
                  <div className="manual-row-grid totals">
                    <input type="number" placeholder="Total Hours" value={row.total_hours} readOnly />
                    <input type="number" placeholder="Undertime (min)" value={row.undertime_minutes} onChange={(e) => updateRow(i, "undertime_minutes", e.target.value)} />
                    <input type="number" placeholder="Regular OT" value={row.regular_ot} readOnly />
                    <input type="number" placeholder="Legal Holiday" value={row.legal_holiday} onChange={(e) => updateRow(i, "legal_holiday", e.target.value)} />
                    <input type="number" placeholder="Unworked Reg Holiday" value={row.unworked_reg_holiday} onChange={(e) => updateRow(i, "unworked_reg_holiday", e.target.value)} />
                    <input type="number" placeholder="Special Holiday" value={row.special_holiday} onChange={(e) => updateRow(i, "special_holiday", e.target.value)} />
                    <input type="number" placeholder="Night Diff" value={row.night_diff} onChange={(e) => updateRow(i, "night_diff", e.target.value)} />
                  </div>
                </div>
              </div>
            ))}

            <div className="manual-actions">
              <button onClick={addRow}>+ Add Row</button>
              <button className="primary upload-button" onClick={submitManual}>Submit</button>
              <button className="danger" onClick={onClose}>Cancel</button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}