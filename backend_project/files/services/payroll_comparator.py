from .payroll_parser import parse_payroll_pdf
from files.models import File, DTREntry

def compare_dtr_with_payroll_pdf(dtr_file):
    """
    Compare DTR entries with the latest payroll PDF for the same owner.
    Updates DTREntry.mismatch_flag and DTREntry.status_flag accordingly.
    Works even if no PDF is found.
    """
    owner = dtr_file.uploaded_by

    pdf_file = File.objects.filter(
        owner=owner,
        file__iendswith=".pdf"
    ).order_by("-uploaded_at").first()

    pdf_map = {}
    if pdf_file:
        pdf_employees = parse_payroll_pdf(pdf_file.file)

        pdf_map = {
            "".join(filter(str.isdigit, str(emp["employee_no"]))): emp
            for emp in pdf_employees
        }

    entries = DTREntry.objects.filter(dtr_file=dtr_file)

    for entry in entries:
        issues = []

        emp_no_normalized = "".join(filter(str.isdigit, str(entry.employee_no)))

        print("DTR:", emp_no_normalized, "PDF keys:", list(pdf_map.keys()))
        
        pdf_emp = pdf_map.get(emp_no_normalized)

        if not pdf_emp:
            issues.append("Missing in Payroll PDF")
        else:
            if float(entry.total_days) != float(pdf_emp.get("wrk_days", 0)):
                issues.append(f"Days mismatch (PDF {pdf_emp.get('wrk_days', 0)} vs DTR {entry.total_days})")
            if float(entry.total_hours) != float(pdf_emp.get("reg_hours", 0)):
                issues.append(f"Hours mismatch (PDF {pdf_emp.get('reg_hours', 0)} vs DTR {entry.total_hours})")
            if float(entry.regular_ot) != float(pdf_emp.get("ot_hours", 0)):
                issues.append(f"OT mismatch (PDF {pdf_emp.get('ot_hours', 0)} vs DTR {entry.regular_ot})")
            if float(entry.night_diff) != float(pdf_emp.get("nd_hours", 0)):
                issues.append(f"Night diff mismatch (PDF {pdf_emp.get('nd_hours', 0)} vs DTR {entry.night_diff})")

        entry.mismatch_flag = ", ".join(issues) if issues else ""
        entry.status_flag = "mismatch" if issues else "match"
        entry.save()