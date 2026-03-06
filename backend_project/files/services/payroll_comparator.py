from .payroll_parser import parse_payroll_pdf
from files.models import PDFFile, DTREntry
import re
import traceback

def compare_dtr_with_payroll_pdf(dtr_file, log_debug=None):
    """
    Compare DTREntry rows with the latest payroll PDF for the same owner.
    Updates DTREntry.mismatch_flag and DTREntry.status_flag.
    Skips OT on Special Holiday / Legal Holiday (SHP / LHP) from total OT comparison.
    """

    def debug(msg):
        prefix = "[DTR-PARSER DEBUG]"
        if log_debug:
            log_debug(f"{prefix} {msg}")
        else:
            print(f"{prefix} {msg}")

    def normalize_emp_no(emp_no):
        if not emp_no:
            return None
        emp_no_str = re.sub(r"\D", "", str(emp_no)).strip()
        return emp_no_str.zfill(5) if emp_no_str else None

    try:
        owner = dtr_file.uploaded_by
        debug(f"Comparing DTR for owner: {owner.username if owner else 'Unknown'}")

        # Get latest PDFFile for this owner
        pdf_file = PDFFile.objects.filter(uploaded_by=owner, file__iendswith=".pdf").order_by("-uploaded_at").first()
        if not pdf_file:
            debug("No payroll PDF found for this owner")
            return
        debug(f"Using payroll PDF: {pdf_file.file.name} (owner: {pdf_file.uploaded_by.username if pdf_file.uploaded_by else 'Unknown'})")

        # Parse PDF
        pdf_employees = parse_payroll_pdf(pdf_file.file.path, log_debug=log_debug)
        pdf_map = {}
        for emp in pdf_employees:
            emp_no_norm = normalize_emp_no(emp.get("employee_no"))
            if not emp_no_norm:
                debug(f"Skipping invalid PDF employee: {emp}")
                continue
            try:
                # Start with raw OT from PDF
                total_ot = float(emp.get("ot_hours") or 0)

                # If tables exist, subtract OT on SHP / LHP days
                tables = emp.get("tables") or []
                for table in tables:
                    for row in table:
                        if not row or len(row) < 17:
                            continue
                        holiday_code = (row[16] or "").strip().upper()  # Last column is holiday code
                        ot_hours = float(row[9] or 0)  # Column 9 is OT
                        if holiday_code in ["SHP", "LHP"]:
                            total_ot -= ot_hours
                total_ot = max(total_ot, 0)

                pdf_map[emp_no_norm] = {
                    "wrk_days": float(emp.get("wrk_days") or 0),
                    "reg_hours": float(emp.get("reg_hours") or 0),
                    "ot_hours": total_ot,
                    "nd_hours": float(emp.get("nd_hours") or 0),
                    "raw": emp
                }
            except Exception as e:
                debug(f"Failed numeric parse for PDF emp {emp_no_norm}: {e}")

        debug(f"PDF employee numbers: {list(pdf_map.keys())}")

        # Compare DTR entries
        entries = DTREntry.objects.filter(dtr_file=dtr_file)
        debug(f"Found {entries.count()} DTR entries")

        for entry in entries:
            issues = []
            emp_no_normalized = normalize_emp_no(entry.employee_no)
            debug(f"Checking DTR emp: {emp_no_normalized} ({entry.full_name})")

            pdf_emp = pdf_map.get(emp_no_normalized)
            if not pdf_emp:
                debug(f" → {entry.full_name} ({emp_no_normalized}) missing in Payroll PDF")
                issues.append("Missing in Payroll PDF")
            else:
                if float(entry.total_days or 0) != float(pdf_emp["wrk_days"]):
                    issues.append(f"Days mismatch (PDF {pdf_emp['wrk_days']} vs DTR {entry.total_days})")
                if float(entry.total_hours or 0) != float(pdf_emp["reg_hours"]):
                    issues.append(f"Hours mismatch (PDF {pdf_emp['reg_hours']} vs DTR {entry.total_hours})")
                if float(entry.regular_ot or 0) != float(pdf_emp["ot_hours"]):
                    issues.append(f"OT mismatch (PDF {pdf_emp['ot_hours']} vs DTR {entry.regular_ot})")
                if float(entry.night_diff or 0) != float(pdf_emp["nd_hours"]):
                    issues.append(f"Night diff mismatch (PDF {pdf_emp['nd_hours']} vs DTR {entry.night_diff})")

            # Update DTREntry
            entry.mismatch_flag = ", ".join(issues) if issues else ""
            entry.status_flag = "mismatch" if issues else "match"
            entry.save()

            if issues:
                debug(f" → Issues found: {issues}")
            else:
                debug(f" → No issues for {entry.full_name} ({emp_no_normalized})")

        debug("DTR comparison complete")

    except Exception as e:
        debug(f"Error during comparison: {str(e)}")
        traceback.print_exc()