import { useMemo } from "react";

export default function useOperationsMetrics(projects = []) {
  return useMemo(() => {
    const utilizationByProject = [];
    const utilizationByEmployee = {};
    let totalExceptions = 0;
    const projectHealth = [];

    // Track overlaps per employee per date across projects
    const overlapTracker = {};

    projects.forEach((proj) => {
      let totalExpectedHours = 0;
      let totalLoggedHours = 0;

      proj.employees.forEach((emp) => {
        // Track utilization by employee
        if (!utilizationByEmployee[emp.employee_no]) {
          utilizationByEmployee[emp.employee_no] = 0;
        }

        emp.rows.forEach((row) => {
          if (!row.daily_data) return;

          Object.keys(row.daily_data).forEach((date) => {
            const val = row.daily_data[date];
            if (val === null || val === "" || isNaN(val)) return;

            // Initialize tracker
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
        totalLoggedHours += emp.rows.reduce((sum, r) => sum + (Number(r.total_hours) || 0), 0);
        utilizationByEmployee[emp.employee_no] += totalLoggedHours;
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

      Object.values(dates).forEach((projectSet) => {
        // Only flag if employee worked on multiple projects same date
        if (projectSet.size > 1) {
          totalOverlaps += projectSet.size - 1;

          // Track all conflicting projects
          projectSet.forEach((p) => conflictingProjectsSet.add(p));
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
    };
  }, [projects]);
}
