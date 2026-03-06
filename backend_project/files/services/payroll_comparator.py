from .payroll_parser import parse_payroll_pdf
from files.models import File, DTREntry
import re

def compare_dtr_with_payroll_pdf(dtr_file, log_debug=None):
    """
    Compare DTR entries with the latest payroll PDF for the same owner.
    Updates DTREntry.mismatch_flag and DTREntry.status_flag accordingly.
    """

    # -------------------------------
    # Debug helper
    # -------------------------------
    def debug(msg):
        prefix = "[DTR-PARSER DEBUG]"
        if log_debug:
            log_debug(f"{prefix} {msg}")
        else:
            print(f"{prefix} {msg}")

    # -------------------------------
    # Employee number normalization
    # -------------------------------
    def normalize_emp_no(emp_no):
        if not emp_no:
            return None
        emp_no_str = re.sub(r"\D", "", str(emp_no)).strip()
        return emp_no_str.zfill(5) if emp_no_str else None

    owner = dtr_file.uploaded_by
    debug(f"Comparing DTR for owner: {owner.username if owner else 'Unknown'}")

    # -------------------------------
    # Find latest payroll PDF robustly
    # -------------------------------
    all_files = File.objects.filter(owner=owner)
    debug(f"All files for owner: {[f.file.name for f in all_files]}")

    pdf_file = all_files.filter(file__iregex=r'\.pdf$').order_by("-uploaded_at").first()

    pdf_map = {}

    if not pdf_file:
        debug("No payroll PDF found for this owner (check filename or field mismatch!)")
    else:
        debug(f"Found Payroll PDF: {pdf_file.file.name}")
        pdf_employees = parse_payroll_pdf(pdf_file.file, log_debug=log_debug)

        debug(f"PDF employees parsed: {len(pdf_employees)}")
        for emp in pdf_employees:
            emp_no_norm = normalize_emp_no(emp.get("employee_no"))
            if not emp_no_norm:
                continue
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

        debug(f"PDF employee numbers detected: {list(pdf_map.keys())}")

    # -------------------------------
    # Compare each DTREntry
    # -------------------------------
    entries = DTREntry.objects.filter(dtr_file=dtr_file)
    debug(f"Found {entries.count()} DTR entries")

    for entry in entries:
        issues = []
        emp_no_normalized = normalize_emp_no(entry.employee_no)
        debug(f"Checking DTR emp: {emp_no_normalized} ({entry.full_name})")

        pdf_emp = pdf_map.get(emp_no_normalized)

        if not pdf_emp:
            debug(f" → {entry.full_name} ({emp_no_normalized}) missing in Payroll PDF. PDF keys: {list(pdf_map.keys())}")
            issues.append("Missing in Payroll PDF")
        else:
            # Compare totals individually
            if float(entry.total_days or 0) != float(pdf_emp["wrk_days"]):
                issues.append(f"Days mismatch (PDF {pdf_emp['wrk_days']} vs DTR {entry.total_days})")
            if float(entry.total_hours or 0) != float(pdf_emp["reg_hours"]):
                issues.append(f"Hours mismatch (PDF {pdf_emp['reg_hours']} vs DTR {entry.total_hours})")
            if float(entry.regular_ot or 0) != float(pdf_emp["ot_hours"]):
                issues.append(f"OT mismatch (PDF {pdf_emp['ot_hours']} vs DTR {entry.regular_ot})")
            if float(entry.night_diff or 0) != float(pdf_emp["nd_hours"]):
                issues.append(f"Night diff mismatch (PDF {pdf_emp['nd_hours']} vs DTR {entry.night_diff})")

        # Update DTR entry
        entry.mismatch_flag = ", ".join(issues) if issues else ""
        entry.status_flag = "mismatch" if issues else "match"
        entry.save()

        if issues:
            debug(f" → Issues found: {issues}")
        else:
            debug(f" → No issues for {entry.full_name} ({emp_no_normalized})")