import { useMemo } from "react";

export default function useEmployee360(employeeNo, projects) {
  return useMemo(() => {
    if (!employeeNo || !projects?.length) return null;

    const daysMap = {};
    let totalHours = 0;
    const projectSet = new Set();
    let isReliever = false;

    projects.forEach((proj) => {
      proj.employees?.forEach((emp) => {
        if (emp.employee_no !== employeeNo) return;

        projectSet.add(proj.project);

        if (emp.rows?.length > 0) {
          emp.rows.forEach((row) => {
            if (!row.daily_data) return;

            // Check if employee is reliever
            if (/reliever/i.test(row.position || "")) isReliever = true;

            Object.keys(row.daily_data).forEach((date) => {
              const val = row.daily_data[date];
              const hours = Number(row.total_hours || 0);

              if (!daysMap[date]) {
                daysMap[date] = { date, projects: [], hours: 0 };
              }

              if (val !== null && val !== "" && !isNaN(val)) {
                daysMap[date].projects.push(proj.project);
                daysMap[date].hours += hours;
                totalHours += hours;
              }
            });
          });
        }
      });
    });

    const uniqueDays = Object.keys(daysMap).length;

    const timeline = Object.values(daysMap)
      .map((day) => ({
        date: day.date,
        projects: [...new Set(day.projects)],
        hours: day.hours,
        isConflict: day.projects.length > 1
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const conflictDays = timeline.filter(d => d.isConflict);
    const conflictCount = conflictDays.length;

    let conflictLevel = "Low";
    if (conflictCount >= 5) conflictLevel = "High";
    else if (conflictCount >= 2) conflictLevel = "Medium";

    return {
      totalHours,
      uniqueDays,
      projectCount: projectSet.size,
      isReliever,
      conflictCount,
      conflictLevel,
      conflictDays,
      timeline
    };
  }, [employeeNo, projects]);
}
