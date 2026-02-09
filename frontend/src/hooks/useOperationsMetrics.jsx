import { useMemo } from "react";

export default function useOperationsMetrics(projects = []) {
  return useMemo(() => {
    const utilizationByProject = [];
    const utilizationByEmployee = {};
    let totalExceptions = 0;
    const projectHealth = [];

    // Track overlaps per employee per date across projects
    const overlapTracker = {};

    // Track employee conflicts per project for heatmap
    const employeeProjectConflicts = {};

    projects.forEach((proj) => {
      let totalExpectedHours = 0;
      let totalLoggedHours = 0;

      proj.employees.forEach((emp) => {
        // Initialize employee utilization
        if (!utilizationByEmployee[emp.employee_no]) {
          utilizationByEmployee[emp.employee_no] = 0;
        }

        // Initialize employeeProjectConflicts
        if (!employeeProjectConflicts[emp.employee_no]) {
          employeeProjectConflicts[emp.employee_no] = {};
        }
        employeeProjectConflicts[emp.employee_no][proj.project] = 0;

        emp.rows.forEach((row) => {
          if (!row.daily_data) return;

          Object.keys(row.daily_data).forEach((date) => {
            const val = row.daily_data[date];
            if (val === null || val === "" || isNaN(val)) return;

            // Initialize overlap tracker
            if (!overlapTracker[emp.employee_no]) overlapTracker[emp.employee_no] = {};
            if (!overlapTracker[emp.employee_no][date]) overlapTracker[emp.employee_no][date] = new Set();

            // Track project for this employee + date
            overlapTracker[emp.employee_no][date].add(proj.project);
          });
        });

        const expectedDays =
          proj.start_date && proj.end_date
            ? Math.ceil((new Date(proj.end_date) - new Date(proj.start_date)) / (1000 * 60 * 60 * 24)) + 1
            : 0;

        totalExpectedHours += expectedDays * 8;
        const empLoggedHours = emp.rows.reduce((sum, r) => sum + (Number(r.total_hours) || 0), 0);
        totalLoggedHours += empLoggedHours;
        utilizationByEmployee[emp.employee_no] += empLoggedHours;
      });

      const utilization = totalExpectedHours ? Math.round((totalLoggedHours / totalExpectedHours) * 100) : 0;

      utilizationByProject.push({
        project: proj.project,
        utilization,
      });

      projectHealth.push({
        project: proj.project,
        utilization,
        manpower: proj.totalEmployees,
        overlaps: 0, // will fill later if needed
        status: utilization < 70 ? "LOW" : utilization > 110 ? "OVER" : "NORMAL",
      });
    });

    // Resolve overlap risks across projects
    const overlapRisks = [];
    Object.entries(overlapTracker).forEach(([employee_no, dates]) => {
      let totalOverlaps = 0;
      const conflictingProjectsSet = new Set();

      Object.entries(dates).forEach(([date, projectSet]) => {
        if (projectSet.size > 1) {
          totalOverlaps += projectSet.size - 1;

          // Track conflicts per project for heatmap
          projectSet.forEach((proj) => {
            employeeProjectConflicts[employee_no][proj] =
              (employeeProjectConflicts[employee_no][proj] || 0) + 1;
            conflictingProjectsSet.add(proj);
          });
        }
      });

      if (totalOverlaps > 0) {
        overlapRisks.push({
          employee_no,
          overlaps: totalOverlaps,
          conflictingProjects: Array.from(conflictingProjectsSet),
        });
        totalExceptions += totalOverlaps;
      }
    });

    return {
      utilizationByProject,
      utilizationByEmployee,
      overlapRisks,
      exceptionSummary: { total: totalExceptions },
      projectHealth,
      employeeProjectConflicts, // 🔹 new heatmap data
    };
  }, [projects]);
}
