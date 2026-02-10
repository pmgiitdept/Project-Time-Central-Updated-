import { useMemo } from "react";

export default function useEmployee360(employeeNo, projects) {
  return useMemo(() => {
    if (!employeeNo) return null;

    let totalHours = 0;
    let totalLoggedDays = 0;
    const projectsInvolved = [];
    const dateSet = new Set();
    let isReliever = false;

    projects.forEach((proj) => {
      proj.employees.forEach((emp) => {
        if (emp.employee_no !== employeeNo) return;

        projectsInvolved.push({
          project: proj.project,
          start_date: proj.start_date,
          end_date: proj.end_date,
          rows: emp.rows,
        });

        emp.rows.forEach((row) => {
          totalHours += Number(row.total_hours) || 0;

          if (row.position && /reliever/i.test(row.position)) {
            isReliever = true;
          }

          Object.entries(row.daily_data || {}).forEach(([date, val]) => {
            if (val !== null && val !== "" && !isNaN(val)) {
              dateSet.add(date);
              totalLoggedDays++;
            }
          });
        });
      });
    });

    return {
      employeeNo,
      totalHours,
      totalLoggedDays,
      uniqueDays: dateSet.size,
      projectsInvolved,
      projectCount: projectsInvolved.length,
      isReliever,
    };
  }, [employeeNo, projects]);
}
