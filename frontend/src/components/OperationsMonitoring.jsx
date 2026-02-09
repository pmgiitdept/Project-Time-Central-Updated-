import { motion } from "framer-motion";
import useOperationsMetrics from "../hooks/useOperationsMetrics";
import "./styles/OperationsMonitoring.css";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

export default function OperationsMonitoring({ projects }) {
  const {
    utilizationByProject,
    utilizationByEmployee,
    overlapRisks,
    exceptionSummary,
    employeeProjectConflicts,
    projectHealth,
  } = useOperationsMetrics(projects);

  // Prepare data for charts
  const utilizationTrend = utilizationByProject.map(p => ({
    project: p.project,
    utilization: p.utilization,
  }));

  const overlapsTrend = overlapRisks.map(emp => ({
    employee: emp.employee_no,
    overlaps: emp.overlaps,
  }));

  const exceptionData = [
    { type: 'Overlaps', value: exceptionSummary.overlaps || 0 },
    { type: 'Missing Hours', value: exceptionSummary.missingHours || 0 },
    { type: 'Other', value: exceptionSummary.total - (exceptionSummary.overlaps || 0) },
  ];

  return (
    <motion.div
      className="operations-monitoring"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h2>🧭 Operations Monitoring Dashboard</h2>

      {/* Snapshot Cards */}
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

      {/* Project Health Table */}
      <div className="ops-section">
        <h3>📊 Project Health</h3>
        <div className="ops-table-wrapper">
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
              {projectHealth.map(proj => (
                <tr key={proj.project}>
                  <td>{proj.project}</td>
                  <td>{proj.utilization}%</td>
                  <td>{proj.manpower}</td>
                  <td>{proj.overlaps}</td>
                  <td className={`status ${proj.status.toLowerCase()}`}>{proj.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trend Charts Side by Side */}
      <div className="ops-section charts-container">
        <div className="chart-card">
          <h4>📈 Utilization Trend</h4>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={utilizationTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="project" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="utilization" stroke="#4f46e5" activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h4>📊 Overlaps by Employee</h4>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={overlapsTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="employee" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="overlaps" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h4>📊 Exception Breakdown</h4>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={exceptionData} layout="vertical" margin={{ top: 10, right: 10, left: 50, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="type" />
              <Tooltip />
              <Bar dataKey="value" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Employee Conflict Heatmap */}
      <div className="ops-section">
        <h3>🔥 Employee Conflict Heatmap</h3>
        <p className="heatmap-note">
          Shows number of overlapping days each employee has across projects. Colors indicate severity: green = low/no conflicts, yellow = medium, red = high.
        </p>
        {Object.keys(employeeProjectConflicts).length === 0 ? (
          <p className="ops-empty">No conflicts detected 🎉</p>
        ) : (
          <div className="heatmap-wrapper scrollable">
            <table className="heatmap-table">
              <thead>
                <tr>
                  <th>Employee Number</th>
                  {utilizationByProject.map(p => <th key={p.project}>{p.project}</th>)}
                </tr>
              </thead>
              <tbody>
                {Object.entries(employeeProjectConflicts).map(([empNo, projects]) => (
                  <tr key={empNo}>
                    <td>{empNo}</td>
                    {utilizationByProject.map(p => {
                      const val = projects[p.project] || 0;
                      let color = "#d1fae5"; // green
                      if (val >= 3) color = "#fca5a5"; // red
                      else if (val === 2) color = "#fde68a"; // yellow

                      return (
                        <td
                          key={p.project}
                          style={{ backgroundColor: color, textAlign: "center" }}
                          title={`${val} overlapping days`}
                        >
                          {val > 0 ? val : ""}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Employee Risk Table */}
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
                  <th>Conflicting Projects</th>
                </tr>
              </thead>
              <tbody>
                {overlapRisks.map(emp => {
                  const riskLevel = emp.overlaps >= 3 ? "high" : emp.overlaps === 2 ? "medium" : "low";
                  return (
                    <tr key={emp.employee_no} data-risk={riskLevel}>
                      <td>{emp.employee_no}</td>
                      <td>{emp.full_name || "N/A"}</td>
                      <td>{emp.overlaps}</td>
                      <td>
                        <span className={`risk-badge ${riskLevel}`}>{riskLevel.toUpperCase()}</span>
                      </td>
                      <td>{emp.conflictingProjects.join(", ")}</td>
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
