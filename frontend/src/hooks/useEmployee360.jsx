import { time } from "framer-motion";
import { useMemo } from "react";

export default function useEmployee360(employeeNo, projects = []) {
  return useMemo(() => {
    if (!employeeNo) return null;

    let totalHours = 0;
    const dateTracker = {}; // { date: Set(projects) }
    const projectSet = new Set();
    const daysMap = {};
    let isReliever = false;

    projects.forEach((proj) => {
      proj.employees.forEach((emp) => {
        if (emp.employee_no !== employeeNo) return;

        projectSet.add(proj.project);

        emp.rows.forEach((row) => {
          totalHours += Number(row.total_hours) || 0;

          if (/reliever/i.test(row.position || "")) {
            isReliever = true;
          }

          if (!row.daily_data) return;

          Object.entries(row.daily_data).forEach(([date, val]) => {
            if (val === null || val === "" || isNaN(val)) return;

            if (!dateTracker[date]) {
              dateTracker[date] = new Set();
            }

            dateTracker[date].add(proj.project);
          });
        });
      });
    });
    
    const timeline = Object.values(daysMap)
        .map(day => ({
            date: day.date,
            projects: Array.from(new Set(day.projects)),
            isConflict: day.projects.length > 1
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    // 🔥 Conflict detection
    const conflictDays = Object.entries(dateTracker)
      .filter(([_, projects]) => projects.size > 1)
      .map(([date, projects]) => ({
        date,
        projects: Array.from(projects),
      }));

    const conflictCount = conflictDays.length;

    let conflictLevel = "LOW";
    if (conflictCount >= 5) conflictLevel = "HIGH";
    else if (conflictCount >= 2) conflictLevel = "MEDIUM";

    return {
      totalHours,
      uniqueDays: Object.keys(dateTracker).length,
      projectCount: projectSet.size,
      isReliever,

      // 🔥 new
      conflictCount,
      conflictLevel,
      conflictDays,
      timeline
    };
  }, [employeeNo, projects]);
}
