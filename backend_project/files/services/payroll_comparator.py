from .payroll_parser import parse_payroll_pdf
from files.models import File, DTREntry
import re

def compare_dtr_with_payroll_pdf(dtr_file, log_debug=None):
    """
    Compare DTR entries with the latest payroll PDF for the same owner.
    Updates DTREntry.mismatch_flag and DTREntry.status_flag accordingly.
    Logs debug messages if log_debug function is provided.
    """

    def debug(msg):
        if log_debug:
            log_debug(msg)
        else:
            print(msg)

    owner = dtr_file.uploaded_by
    debug(f"Comparing DTR for owner: {owner.username if owner else 'Unknown'}")

    pdf_file = File.objects.filter(
        owner=owner,
        file__iendswith=".pdf"
    ).order_by("-uploaded_at").first()

    pdf_map = {}
    if not pdf_file:
        debug("No payroll PDF found for this owner")
    else:
        debug(f"Found PDF: {pdf_file.file.name}")
        pdf_employees = parse_payroll_pdf(pdf_file.file)

        for emp in pdf_employees:
            # Normalize: remove all non-digit characters, strip leading zeros
            emp_no_norm = re.sub(r"\D", "", str(emp.get("employee_no", ""))).lstrip("0")
            try:
                pdf_map[emp_no_norm] = {
                    "wrk_days": float(emp.get("wrk_days") or 0),
                    "reg_hours": float(emp.get("reg_hours") or 0),
                    "ot_hours": float(emp.get("ot_hours") or 0),
                    "nd_hours": float(emp.get("nd_hours") or 0),
                    "raw": emp
                }
            except Exception as e:
                debug(f"Failed to parse numeric fields for PDF emp {emp_no_norm}: {e}")

        debug(f"PDF employee numbers: {list(pdf_map.keys())}")

    entries = DTREntry.objects.filter(dtr_file=dtr_file)
    debug(f"Found {entries.count()} DTR entries")

    for entry in entries:
        issues = []

        # Normalize DTR emp_no the same way
        emp_no_normalized = re.sub(r"\D", "", str(entry.employee_no)).lstrip("0")
        debug(f"Checking DTR emp: {emp_no_normalized}")

        pdf_emp = pdf_map.get(emp_no_normalized)

        if not pdf_emp:
            issues.append("Missing in Payroll PDF")
            debug(f" → {entry.full_name} ({emp_no_normalized}) missing in PDF")
        else:
            debug(f" → Comparing with PDF: {pdf_emp['raw']}")
            if float(entry.total_days) != float(pdf_emp["wrk_days"]):
                issues.append(f"Days mismatch (PDF {pdf_emp['wrk_days']} vs DTR {entry.total_days})")
            if float(entry.total_hours) != float(pdf_emp["reg_hours"]):
                issues.append(f"Hours mismatch (PDF {pdf_emp['reg_hours']} vs DTR {entry.total_hours})")
            if float(entry.regular_ot) != float(pdf_emp["ot_hours"]):
                issues.append(f"OT mismatch (PDF {pdf_emp['ot_hours']} vs DTR {entry.regular_ot})")
            if float(entry.night_diff) != float(pdf_emp["nd_hours"]):
                issues.append(f"Night diff mismatch (PDF {pdf_emp['nd_hours']} vs DTR {entry.night_diff})")

        entry.mismatch_flag = ", ".join(issues) if issues else ""
        entry.status_flag = "mismatch" if issues else "match"
        entry.save()

        if issues:
            debug(f" → Issues found: {issues}")
        else:
            debug(f" → No issues for {entry.full_name} ({emp_no_normalized})")