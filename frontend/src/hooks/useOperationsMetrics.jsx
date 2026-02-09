import { useMemo } from "react";

export default function useOperationsMetrics(projects = []) {
  return useMemo(() => {
    const utilizationByProject = [];
    const utilizationByEmployee = {};
    const overlapMap = {};
    const projectHealth = [];
    let totalExceptions = 0;

    projects.forEach((proj) => {
      let totalExpectedHours = 0;
      let totalLoggedHours = 0;
      let overlaps = 0;

      proj.employees.forEach((emp) => {
        // Track employee dates across projects
        emp.rows.forEach((row) => {
          if (!row.daily_data) return;

          Object.keys(row.daily_data).forEach((date) => {
            const key = `${emp.employee_no}-${date}`;
            overlapMap[key] = (overlapMap[key] || 0) + 1;
          });
        });

        const expectedDays =
          proj.start_date && proj.end_date
            ? Math.ceil(
                (new Date(proj.end_date) - new Date(proj.start_date)) /
                  (1000 * 60 * 60 * 24)
              ) + 1
            : 0;

        totalExpectedHours += expectedDays * 8;
        totalLoggedHours += emp.rows.reduce(
          (sum, r) => sum + (Number(r.total_hours) || 0),
          0
        );
      });

      const utilization = totalExpectedHours
        ? Math.round((totalLoggedHours / totalExpectedHours) * 100)
        : 0;

      utilizationByProject.push({
        project: proj.project,
        utilization,
      });

      projectHealth.push({
        project: proj.project,
        utilization,
        manpower: proj.totalEmployees,
        overlaps: 0, // filled later
        status:
          utilization < 70
            ? "LOW"
            : utilization > 110
            ? "OVER"
            : "NORMAL",
      });
    });

    // Resolve overlaps
    const overlapRisks = [];
    Object.entries(overlapMap).forEach(([key, count]) => {
      if (count > 1) {
        const [employee_no] = key.split("-");
        overlapRisks.push({
          employee_no,
          overlaps: count - 1,
        });
        totalExceptions++;
      }
    });

    return {
      utilizationByProject,
      utilizationByEmployee,
      overlapRisks,
      exceptionSummary: { total: totalExceptions },
      projectHealth,
    };
  }, [projects]);
}
