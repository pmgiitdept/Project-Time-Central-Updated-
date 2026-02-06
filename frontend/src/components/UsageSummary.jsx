/* components/UsageSummary.jsx */
import { useEffect, useState } from "react";
import api from "../api";
import "./styles/DTRTable.css";

export default function UsageSummary() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsageSummary();
  }, []);

  const fetchUsageSummary = async () => {
    setLoading(true);
    try {
      // 1️⃣ Get all DTR files (same source as DTRTable)
      const res = await api.get("/files/dtr/files/");
      const files = res.data.results || res.data;

      const summaries = [];

      // 2️⃣ For each file, load its content
      for (const file of files) {
        const contentRes = await api.get(
          `/files/dtr/files/${file.id}/content/`
        );

        const rows = contentRes.data.rows || [];

        // 3️⃣ Build unique employee list
        const employeeMap = new Map();

        rows.forEach((row) => {
          if (row?.employee_no) {
            employeeMap.set(row.employee_no, {
              full_name: row.full_name,
              employee_no: row.employee_no,
            });
          }
        });

        summaries.push({
          file_id: file.id,
          project:
            file.uploaded_by?.full_name ||
            file.uploaded_by?.username ||
            "Unknown",
          start_date: file.start_date,
          end_date: file.end_date,
          totalEmployees: employeeMap.size,
          employees: Array.from(employeeMap.values()),
        });
      }

      setProjects(summaries);
    } catch (err) {
      console.error("Failed to load usage summary:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="usage-summary">
      <h2>📊 Project Manpower Usage Summary</h2>

      {loading && <p>Loading records...</p>}

      {!loading &&
        projects.map((proj) => (
          <div key={proj.file_id} className="usage-card">
            <div className="usage-header">
              <h3>{proj.project}</h3>
              <span className="cutoff">
                {proj.start_date
                  ? new Date(proj.start_date).toLocaleDateString()
                  : "N/A"}{" "}
                →{" "}
                {proj.end_date
                  ? new Date(proj.end_date).toLocaleDateString()
                  : "N/A"}
              </span>
            </div>

            <p>
              👥 <strong>Total Employees:</strong>{" "}
              {proj.totalEmployees}
            </p>

            <table className="usage-table">
              <thead>
                <tr>
                  <th>Employee No</th>
                  <th>Full Name</th>
                </tr>
              </thead>
              <tbody>
                {proj.employees.map((emp) => (
                  <tr key={emp.employee_no}>
                    <td>{emp.employee_no}</td>
                    <td>{emp.full_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </div>
  );
}
