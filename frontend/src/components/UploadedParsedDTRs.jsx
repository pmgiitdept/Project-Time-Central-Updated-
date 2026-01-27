/* UploadedParsedDTRs.jsx */
import { useState, useEffect } from "react";
import api from "../api";
import { motion } from "framer-motion";
import ParsedDTRModal from "./ParsedDTRModal";
import "./styles/ClientDashboard.css";

export default function UploadedParsedDTRs({ refreshTrigger, currentUser, employeeFilter }) {
  const [parsedDTRs, setParsedDTRs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedDTR, setSelectedDTR] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const fetchParsedDTRs = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/files/parsed-dtrs/");
        let data = res.data.results || res.data;

        if (!Array.isArray(data)) {
          console.error("Unexpected response format:", res.data);
          setParsedDTRs([]);
          setError("Unexpected response from server");
        } else {
          if (employeeFilter) {
            data = data.filter(dtr => dtr.employee_no === employeeFilter);
          }
          setParsedDTRs(data);
        }
      } catch (err) {
        console.error("Failed to fetch Parsed DTRs:", err);
        setParsedDTRs([]);
        setError("Failed to fetch Parsed DTRs");
      } finally {
        setLoading(false);
      }
    };

    fetchParsedDTRs();
  }, [refreshTrigger, employeeFilter]);

  const selectDTR = (dtr) => setSelectedDTR(dtr);

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  const handleDeleteDTR = async (dtrId) => {
    const confirmed = window.confirm("Are you sure you want to delete this Parsed DTR?");
    if (!confirmed) return;

    try {
      await api.delete(`/files/parsed-dtrs/${dtrId}/`);
      setParsedDTRs(prev => prev.filter(d => d.id !== dtrId));
      alert("Parsed DTR deleted successfully!");
    } catch (err) {
      console.error("Failed to delete Parsed DTR:", err);
      alert("Failed to delete the Parsed DTR. Please try again.");
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Left sidebar for Parsed DTRs */}
      <motion.div
        className="upload-card sidebar1"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        <div className="upload-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 className="upload-title">Uploaded Parsed DTRs</h2>
          <button onClick={toggleCollapse} className="collapse-btn">
            {isCollapsed ? "🔽 Show" : "🔼 Hide"}
          </button>
        </div>

        {!isCollapsed && (
          <>
            {loading ? (
              <p>Loading Parsed DTRs...</p>
            ) : error ? (
              <p style={{ color: "red" }}>{error}</p>
            ) : parsedDTRs.length === 0 ? (
              <p>No Parsed DTRs uploaded yet.</p>
            ) : (
              <div className="pdf-grid">
                {parsedDTRs.map((dtr) => (
                  <motion.div
                    key={dtr.id}
                    className="pdf-card"
                    whileHover={{ scale: 1.03 }}
                    transition={{ duration: 0.2 }}
                  >
                    <p className="pdf-name">👤 {dtr.employee_name}</p>
                    <p className="pdf-info">
                      Employee No: <strong>{dtr.employee_no}</strong>
                    </p>
                    <p className="pdf-info">
                      Period: <strong>{dtr.period_from} → {dtr.period_to}</strong>
                    </p>
                    <p className="pdf-info">
                      Project: <strong>{dtr.project || "N/A"}</strong>
                    </p>
                    <p className="pdf-info">
                      Dept: <strong>{dtr.department || "N/A"}</strong>
                    </p>

                    <div className="pdf-buttons">
                      <button onClick={() => selectDTR(dtr)} className="upload-button">
                        🧾 View DTR
                      </button>

                      {currentUser?.role === "admin" && (
                        <button
                          onClick={() => handleDeleteDTR(dtr.id)}
                          className="upload-button delete-btn"
                          style={{
                            background: "#e63946",
                            color: "white",
                            marginLeft: "0.5rem",
                          }}
                        >
                          🗑️ Delete
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* Main content for DTR viewer */}
      {selectedDTR && (
        <ParsedDTRModal
          dtrData={selectedDTR}
          currentUser={currentUser}
          onClose={() => setSelectedDTR(null)}
        />
      )}
    </div>
  );
}
