from .payroll_parser import parse_payroll_pdf
from files.models import PDFFile, DTREntry
import re
import traceback
from datetime import datetime


def compare_dtr_with_payroll_pdf(dtr_file, log_debug=None):

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

    # ✅ Flexible date parser
    def parse_date_flexible(date_val):
        if not date_val:
            return None

        # already a date object
        if hasattr(date_val, "year"):
            return date_val

        date_str = str(date_val).strip()

        formats = [
            "%Y-%m-%d",
            "%m/%d/%Y",
            "%m-%d-%Y",
            "%b %d, %Y",
            "%B %d, %Y",
        ]

        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt).date()
            except ValueError:
                continue

        return None

    try:
        owner = dtr_file.uploaded_by
        debug(f"Comparing DTR for owner: {owner.username if owner else 'Unknown'}")

        dtr_start = parse_date_flexible(dtr_file.start_date)
        dtr_end = parse_date_flexible(dtr_file.end_date)

        debug(f"DTR Period: {dtr_start} → {dtr_end}")

        if not dtr_start or not dtr_end:
            debug("DTR file does not have a valid period")
            return

        pdf_candidates = PDFFile.objects.filter(
            uploaded_by=owner,
            file__iendswith=".pdf"
        )

        pdf_file = None

        for pdf in pdf_candidates:

            if not pdf.start_date or not pdf.end_date:
                debug(f"Skipping PDF without period: {pdf.file.name}")
                continue

            pdf_start = parse_date_flexible(pdf.start_date)
            pdf_end = parse_date_flexible(pdf.end_date)

            if not pdf_start or not pdf_end:
                debug(f"Skipping PDF with unreadable period: {pdf.file.name}")
                continue

            debug(f"Checking PDF {pdf.file.name} → {pdf_start} → {pdf_end}")

            if pdf_start == dtr_start and pdf_end == dtr_end:
                pdf_file = pdf
                break

        if not pdf_file:
            debug("No Payroll PDF found with matching period")

            entries = DTREntry.objects.filter(dtr_file=dtr_file)

            for entry in entries:
                entry.status_flag = "mismatch"
                entry.mismatch_flag = "Payroll PDF with same period not found"
                entry.save()

            return

        debug(f"Using payroll PDF: {pdf_file.file.name}")

        pdf_employees = parse_payroll_pdf(pdf_file.file.path, log_debug=log_debug)
        pdf_map = {}

        for emp in pdf_employees:
            emp_no_norm = normalize_emp_no(emp.get("employee_no"))
            if not emp_no_norm:
                continue

            try:
                total_ot = 0
                for ot, holiday in zip(emp.get("ot_per_row", []), emp.get("holiday_codes", [])):
                    if holiday not in ["SHP", "LHP"]:
                        total_ot += ot

                pdf_map[emp_no_norm] = {
                    "wrk_days": float(emp.get("wrk_days") or 0),
                    "reg_hours": float(emp.get("reg_hours") or 0),
                    "ot_hours": total_ot,
                    "nd_hours": float(emp.get("nd_hours") or 0),
                }

            except Exception as e:
                debug(f"Failed numeric parse for PDF emp {emp_no_norm}: {e}")

        debug(f"PDF employee numbers: {list(pdf_map.keys())}")

        entries = DTREntry.objects.filter(dtr_file=dtr_file)
        debug(f"Found {entries.count()} DTR entries")

        for entry in entries:

            issues = []
            emp_no_norm = normalize_emp_no(entry.employee_no)

            debug(f"Checking DTR emp: {emp_no_norm} ({entry.full_name})")

            pdf_emp = pdf_map.get(emp_no_norm)

            if not pdf_emp:
                issues.append("Missing in Payroll PDF")

            else:

                if float(entry.total_days or 0) != pdf_emp["wrk_days"]:
                    issues.append(
                        f"Days mismatch (PDF {pdf_emp['wrk_days']} vs DTR {entry.total_days})"
                    )

                if float(entry.total_hours or 0) != pdf_emp["reg_hours"]:
                    issues.append(
                        f"Hours mismatch (PDF {pdf_emp['reg_hours']} vs DTR {entry.total_hours})"
                    )

                if float(entry.regular_ot or 0) != pdf_emp["ot_hours"]:
                    issues.append(
                        f"OT mismatch (PDF {pdf_emp['ot_hours']} vs DTR {entry.regular_ot})"
                    )

                if float(entry.night_diff or 0) != pdf_emp["nd_hours"]:
                    issues.append(
                        f"Night diff mismatch (PDF {pdf_emp['nd_hours']} vs DTR {entry.night_diff})"
                    )

            entry.mismatch_flag = ", ".join(issues) if issues else ""
            entry.status_flag = "mismatch" if issues else "match"
            entry.save()

            if issues:
                debug(f" → Issues found: {issues}")
            else:
                debug(f" → No issues for {entry.full_name} ({emp_no_norm})")

        debug("DTR comparison complete")

    except Exception as e:
        debug(f"Error during comparison: {str(e)}")
        traceback.print_exc()