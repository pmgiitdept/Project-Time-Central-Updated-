import { motion } from "framer-motion";
import useOperationsMetrics from "../hooks/useOperationsMetrics";
import "./styles/OperationsMonitoring.css";

export default function OperationsMonitoring({ projects }) {
  const {
    utilizationByProject,
    utilizationByEmployee,
    overlapRisks,
    exceptionSummary,
    projectHealth,
  } = useOperationsMetrics(projects);

  return (
    <motion.div
      className="operations-monitoring"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h2>🧭 Operations Monitoring Dashboard</h2>

      {/* 1️⃣ High-level Ops Snapshot */}
      <div className="ops-cards">
        <div className="ops-card">
          <h4>⚙ Utilization</h4>
          <p>{utilizationByProject.length} projects analyzed</p>
        </div>

        <div className="ops-card">
          <h4>⚠ Overlap Risks</h4>
          <p>{overlapRisks.length} employees flagged</p>
        </div>

        <div className="ops-card">
          <h4>🚨 Exceptions</h4>
          <p>{exceptionSummary.total} total issues</p>
        </div>
      </div>

      {/* 2️⃣ Project Health Table */}
      <div className="ops-section">
        <h3>📊 Project Health</h3>
        <table className="ops-table">
          <thead>
            <tr>
              <th>Project</th>
              <th>Utilization</th>
              <th>Manpower</th>
              <th>Overlaps</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {projectHealth.map((proj) => (
              <tr key={proj.project}>
                <td>{proj.project}</td>
                <td>{proj.utilization}%</td>
                <td>{proj.manpower}</td>
                <td>{proj.overlaps}</td>
                <td className={`status ${proj.status.toLowerCase()}`}>
                  {proj.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ops-section">
        <h3>👤 Employee Risks</h3>

        {overlapRisks.length === 0 ? (
            <p className="ops-empty">No overlap risks detected 🎉</p>
        ) : (
            <div className="ops-table-wrapper">
            <table className="ops-table">
                <thead>
                <tr>
                    <th>Employee No</th>
                    <th>Name</th>
                    <th>Overlaps</th>
                    <th>Risk Level</th>
                </tr>
                </thead>
                <tbody>
                {overlapRisks.map((emp) => {
                    const riskLevel =
                    emp.overlaps >= 3 ? "high" :
                    emp.overlaps === 2 ? "medium" :
                    "low";

                    return (
                    <tr key={emp.employee_no} data-risk={riskLevel}>
                        <td>{emp.employee_no}</td>
                        <td>{emp.full_name}</td>
                        <td>{emp.overlaps}</td>
                        <td>
                        <span className={`risk-badge ${riskLevel}`}>
                            {riskLevel.toUpperCase()}
                        </span>
                        </td>
                    </tr>
                    );
                })}
                </tbody>
            </table>
            </div>
        )}
        </div>
    </motion.div>
  );
}
