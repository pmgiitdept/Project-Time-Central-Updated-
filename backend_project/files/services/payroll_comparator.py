from .payroll_parser import parse_payroll_pdf
from files.models import File
from models import DTREntry


def compare_dtr_with_payroll_pdf(dtr_file):

    owner = dtr_file.uploaded_by

    pdf_file = File.objects.filter(
        owner=owner,
        file__iendswith=".pdf"
    ).order_by("-uploaded_at").first()

    if not pdf_file:
        print("No payroll PDF found")
        return

    pdf_employees = parse_payroll_pdf(pdf_file.file)

    pdf_map = {
        emp["employee_no"]: emp
        for emp in pdf_employees
    }

    entries = DTREntry.objects.filter(dtr_file=dtr_file)

    for entry in entries:

        issues = []

        pdf_emp = pdf_map.get(str(entry.employee_no))

        if not pdf_emp:
            issues.append("Missing in Payroll PDF")

        else:

            if float(entry.total_days) != float(pdf_emp["wrk_days"]):
                issues.append(
                    f"Days mismatch (PDF {pdf_emp['wrk_days']} vs DTR {entry.total_days})"
                )

            if float(entry.total_hours) != float(pdf_emp["reg_hours"]):
                issues.append(
                    f"Hours mismatch (PDF {pdf_emp['reg_hours']} vs DTR {entry.total_hours})"
                )

            if float(entry.regular_ot) != float(pdf_emp["ot_hours"]):
                issues.append(
                    f"OT mismatch (PDF {pdf_emp['ot_hours']} vs DTR {entry.regular_ot})"
                )

            if float(entry.night_diff) != float(pdf_emp["nd_hours"]):
                issues.append(
                    f"Night diff mismatch (PDF {pdf_emp['nd_hours']} vs DTR {entry.night_diff})"
                )

        entry.mismatch_flag = ", ".join(issues) if issues else ""
        entry.save()