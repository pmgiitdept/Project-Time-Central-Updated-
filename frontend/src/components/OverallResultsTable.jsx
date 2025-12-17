/* components/OverallResultsTable.jsx */
import { useEffect, useState } from "react";
import api from "../api";
import "./styles/OverallResults.css";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Label
} from "recharts";
import { FiRefreshCw } from "react-icons/fi";
import { FaChartPie, FaProjectDiagram, FaUsers } from "react-icons/fa";

const COLORS = ["#28a745", "#ffc107", "#dc3545"];

export default function OverallResultsTable() {
  const [dtrStats, setDtrStats] = useState([]);
  const [empStats, setEmpStats] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [projectList, setProjectList] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [projectStats, setProjectStats] = useState([]);

  // --- Fetch DTR summary ---
  const fetchDTRStats = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await api.get("/files/dtr/files/", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const files = Array.isArray(res.data.results) ? res.data.results : res.data;
      const verified = files.filter((f) => f.status?.toLowerCase() === "verified").length;
      const pending = files.filter((f) => f.status?.toLowerCase() === "pending").length;
      const rejected = files.filter((f) => f.status?.toLowerCase() === "rejected").length;

      const stats = [
        { name: "Verified", value: verified },
        { name: "Pending", value: pending },
        { name: "Rejected", value: rejected },
      ];

      setDtrStats(stats.some((s) => s.value > 0) ? stats : [{ name: "No Data", value: 1 }]);
    } catch (err) {
      console.error("❌ Failed to load DTR stats:", err);
      toast.error("Failed to load DTR stats");
    }
  };

  // --- Fetch Employee Directory summary ---
  const fetchEmployeeStats = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await api.get("/files/employees/", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const employees = Array.isArray(res.data.results) ? res.data.results : res.data;
      const counts = {};
      const projects = new Set();

      employees.forEach((emp) => {
        const key = emp.project || emp.department || "Unassigned";
        counts[key] = (counts[key] || 0) + 1;
        if (emp.project) projects.add(emp.project);
      });

      const stats = Object.entries(counts).map(([name, value]) => ({ name, value }));
      setEmpStats(stats.length ? stats : [{ name: "No Data", value: 0 }]);
      setProjectList([...projects]);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load employee stats");
    }
  };

  const fetchProjectStats = async (projectName) => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await api.get("/files/employees/", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const employees = Array.isArray(res.data.results) ? res.data.results : res.data;
      const filtered = employees.filter(
        (emp) => emp.project && emp.project.toLowerCase() === projectName.toLowerCase()
      );

      const deptCounts = {};
      filtered.forEach((emp) => {
        const dept = emp.department || "Unassigned";
        deptCounts[dept] = (deptCounts[dept] || 0) + 1;
      });

      const stats = Object.entries(deptCounts).map(([name, value]) => ({ name, value }));
      setProjectStats(stats.length ? stats : [{ name: "No Data", value: 0 }]);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load project stats");
    }
  };

  const fetchAllStats = async () => {
    await Promise.all([fetchDTRStats(), fetchEmployeeStats()]);
  };

  useEffect(() => { fetchAllStats(); }, []);
  useEffect(() => { if (selectedProject) fetchProjectStats(selectedProject); }, [selectedProject]);

  return (
    <motion.div
      className="file-content-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: "easeInOut" }}
    >
      <div className="table-card">
        <div className="header-section">
          <h2 className="summary-title">Overall Analytics Dashboard</h2>
          <p className="summary-subtitle">
            Gain insights into DTR verification progress and workforce distribution.
          </p>
          <button
            onClick={async () => {
              setRefreshing(true);
              await fetchAllStats();
              setRefreshing(false);
            }}
            className="btn-refresh"
            disabled={refreshing}
          >
            <FiRefreshCw
              className={refreshing ? "spinning" : ""}
              style={{ marginRight: "0.5rem" }}
              size={20}
            />
            {refreshing ? "Refreshing..." : "Refresh Data"}
          </button>
        </div>

        {/* === DTR Pie Charts === */}
        <section className="chart-section">
          <div className="chart-header">
            <FaChartPie size={24} color="#28a745" style={{ marginRight: 8 }} />
            <h3 className="chart-title">DTR File Status Overview</h3>
          </div>
          <p className="chart-caption">
            This section summarizes the <strong>status of all DTR uploads</strong>, giving a quick
            snapshot of <span className="highlight">Verified</span>, <span className="highlight">Pending</span>,
            and <span className="highlight">Rejected</span> submissions.
          </p>
          <div className="multi-pie-wrapper">
            {["Verified", "Pending", "Rejected"].map((status, i) => {
              const data = dtrStats.filter((s) => s.name === status);
              const color = COLORS[i % COLORS.length];
              const value = data.length ? data[0].value : 0;

              return (
                <div key={status} className="mini-pie-card">
                  <h4 style={{ marginBottom: "0.5rem", color }}>{status}</h4>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={[{ name: status, value }]}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ value }) => value}
                      >
                        <Cell fill={color} />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <p className="mini-pie-value">
                    {value} {value === 1 ? "File" : "Files"}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* === Employee Count per Project / Department === */}
        <section className="chart-section">
          <div className="chart-header">
            <FaUsers size={22} color="#007bff" style={{ marginRight: 8 }} />
            <h3 className="chart-title">Employee Count per Project</h3>
          </div>
          <p className="chart-caption">
            Understand how employees are distributed across each <strong>Project</strong>. Hover over bars for details.
          </p>

          {/* 🧮 Calculate Total Employee Count */}
          <div className="chart-summary" style={{ textAlign: "center", marginBottom: "0.8rem" }}>
            <p style={{ fontSize: "1rem", color: "#555" }}>
              <strong>Total Manpower:</strong>{" "}
              <span style={{ color: "#007bff", fontWeight: "600" }}>
                {empStats.reduce((sum, e) => sum + (e.value || 0), 0).toLocaleString()}
              </span>
            </p>
          </div>

          {/* 🆕 Scrollable Chart Wrapper */}
          <div style={{ width: "100%", overflowX: "auto" }}>
            <div style={{ width: `${empStats.length * 80}px`, minWidth: "100%" }}>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={empStats}
                  margin={{ top: 10, right: 20, left: 10, bottom: 50 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    interval={0}               // ✅ Show all labels
                    angle={-35}                // ✅ Tilt for readability
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 12, fill: "#333", fontWeight: 500 }}
                    tickLine={false}
                  >
                    <Label
                      value="Projects"
                      offset={-5}
                      position="insideBottom"
                      style={{ fill: "#555", fontWeight: "bold" }}
                    />
                  </XAxis>
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#007bff" name="Employee Count" radius={[8, 8, 0, 0]} barSize={30}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* === Project-Specific Breakdown === */}
        <section className="chart-section">
          <div className="chart-header">
            <FaProjectDiagram size={22} color="#17a2b8" style={{ marginRight: 8 }} />
            <h3 className="chart-title">Employee Breakdown by Department (Per Project)</h3>
          </div>
          <p className="chart-caption">
            Select a project to explore how its workforce is divided among different{" "}
            <strong>Projects</strong>.
          </p>
          <div className="dropdown-wrapper">
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="chart-dropdown"
            >
              <option value="">Select a Project</option>
              {projectList.map((proj, i) => (
                <option key={i} value={proj}>
                  {proj}
                </option>
              ))}
            </select>
          </div>

          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={projectStats} margin={{ top: 10, right: 20, left: 10, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-15} textAnchor="end" interval={0} height={60} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#17a2b8" name="Employee Count"  radius={[8, 8, 0, 0]}/>
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>
    </motion.div>
  );
}