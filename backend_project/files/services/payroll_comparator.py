from .payroll_parser import parse_payroll_pdf
from files.models import PDFFile, DTREntry
import re
import traceback
from datetime import datetime, timedelta

def compare_dtr_with_payroll_pdf(dtr_file, log_debug=None):

    def debug(msg):
        prefix = "[DTR-PARSER DEBUG]"
        if log_debug:
            log_debug(f"{prefix} {msg}")
        else:
            print(f"{prefix} {msg}")

    def normalize_emp_no(emp_no):
        """Keep only digits, remove prefixes like 'PM', and pad to 5 digits."""
        if not emp_no:
            return None
        emp_no_str = re.sub(r"\D", "", str(emp_no)).strip()  
        return emp_no_str.zfill(5) if emp_no_str else None

    def parse_date_flexible(date_val):
        if not date_val:
            return None
        if hasattr(date_val, "year"):
            return date_val
        date_str = str(date_val).strip()
        date_str = re.sub(r"\s+", " ", date_str)

        space_date = re.match(r"(\d{1,2}) (\d{1,2}) (\d{4})", date_str)
        if space_date:
            day, month, year = space_date.groups()
            try:
                return datetime(int(year), int(month), int(day)).date()
            except:
                pass

        formats = [
            "%Y-%m-%d",
            "%d/%m/%Y",
            "%m/%d/%Y",
            "%m-%d-%Y",
            "%d-%m-%Y",
            "%b %d, %Y",
            "%B %d, %Y",
        ]

        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt).date()
            except ValueError:
                continue

        return None

    def parse_payroll_period(date_str):
        """Normalize payroll period using end date."""
        if not date_str:
            return None, None
        text = str(date_str)

        match = re.search(r"(\d{1,2}\s+\d{1,2}\s+\d{4}).*?(\d{1,2}\s+\d{1,2}\s+\d{4})", text)
        if match:
            start_raw, end_raw = match.groups()
            end_date = parse_date_flexible(end_raw)
        else:
            end_date = parse_date_flexible(text)

        if not end_date:
            return None, None

        if end_date.day <= 15:
            period_start = end_date.replace(day=1)
            period_end = end_date.replace(day=15)
        else:
            period_start = end_date.replace(day=16)
            next_month = end_date.replace(day=28) + timedelta(days=4)
            last_day = (next_month - timedelta(days=next_month.day)).day
            period_end = end_date.replace(day=last_day)

        return period_start, period_end

    try:
        owner = dtr_file.uploaded_by
        debug(f"Comparing DTR for owner: {owner.username if owner else 'Unknown'}")

        dtr_start, dtr_end = parse_payroll_period(dtr_file.end_date)
        debug(f"DTR Period (normalized) : {dtr_start} → {dtr_end}")

        if not dtr_start or not dtr_end:
            debug("DTR file does not have a valid period")
            return

        pdf_candidates = PDFFile.objects.filter(
            uploaded_by=owner,
            file__iendswith=".pdf"
        )

        if not pdf_candidates.exists():
            debug("No PDF files found for this owner")
            entries = DTREntry.objects.filter(dtr_file=dtr_file)
            for entry in entries:
                entry.status_flag = "mismatch"
                entry.mismatch_flag = "Payroll PDF with same period not found"
                entry.save()
            return

        # --- BUILD COMBINED PDF EMPLOYEE MAP ACROSS ALL PDFs OF SAME PERIOD ---
        pdf_map = {}
        pdf_found = False

        for pdf in pdf_candidates:
            if not pdf.end_date:
                debug(f"Skipping PDF without end date: {pdf.file.name}")
                continue

            pdf_start, pdf_end = parse_payroll_period(pdf.end_date)
            if not pdf_start or not pdf_end:
                debug(f"Skipping PDF with unreadable period: {pdf.file.name}")
                continue

            if pdf_start != dtr_start or pdf_end != dtr_end:
                debug(f"PDF {pdf.file.name} period {pdf_start} → {pdf_end} does not match DTR period")
                continue

            pdf_found = True
            debug(f"Parsing PDF {pdf.file.name} for period {pdf_start} → {pdf_end}")
            pdf_employees = parse_payroll_pdf(pdf.file.path, log_debug=log_debug)

            for emp in pdf_employees:
                emp_no_norm = normalize_emp_no(emp.get("employee_no"))
                if not emp_no_norm:
                    header_line = emp.get("header_text_line") or ""
                    match = re.search(r"([A-Z]*)(\d{5})", header_line)
                    if match:
                        emp_no_norm = normalize_emp_no(match.group(2))
                if not emp_no_norm:
                    continue

                try:
                    total_ot = 0
                    for ot, holiday in zip(emp.get("ot_per_row", []), emp.get("holiday_codes", [])):
                        if holiday not in ["SHP", "LHP"]:
                            total_ot += float(ot or 0)

                    # Add to map only if missing (can also sum if multiple PDFs)
                    if emp_no_norm not in pdf_map:
                        pdf_map[emp_no_norm] = {
                            "wrk_days": float(emp.get("wrk_days") or 0),
                            "reg_hours": float(emp.get("reg_hours") or 0),
                            "ot_hours": total_ot,
                            "nd_hours": float(emp.get("nd_hours") or 0),
                            "full_name": emp.get("full_name") or "Unknown",
                        }
                except Exception as e:
                    debug(f"Failed numeric parse for PDF emp {emp_no_norm}: {e}")

        if not pdf_found:
            debug("No Payroll PDF found with matching period")
            entries = DTREntry.objects.filter(dtr_file=dtr_file)
            for entry in entries:
                entry.status_flag = "mismatch"
                entry.mismatch_flag = "Payroll PDF with same period not found"
                entry.save()
            return

        debug(f"PDF employee numbers after normalization: {list(pdf_map.keys())}")
        entries = DTREntry.objects.filter(dtr_file=dtr_file)
        debug(f"Found {entries.count()} DTR entries")

        # --- COMPARE EACH DTR ENTRY ---
        for entry in entries:
            issues = []
            emp_no_norm = normalize_emp_no(entry.employee_no)
            debug(f"Checking DTR emp: {emp_no_norm} ({entry.full_name})")
            pdf_emp = pdf_map.get(emp_no_norm)

            if not pdf_emp:
                issues.append("Missing in Payroll PDF(s)")
            else:
                if float(entry.total_days or 0) != pdf_emp["wrk_days"]:
                    issues.append(f"Days mismatch (PDF {pdf_emp['wrk_days']} vs DTR {entry.total_days})")
                if float(entry.total_hours or 0) != pdf_emp["reg_hours"]:
                    issues.append(f"Hours mismatch (PDF {pdf_emp['reg_hours']} vs DTR {entry.total_hours})")
                if float(entry.regular_ot or 0) != pdf_emp["ot_hours"]:
                    issues.append(f"OT mismatch (PDF {pdf_emp['ot_hours']} vs DTR {entry.regular_ot})")
                if float(entry.night_diff or 0) != pdf_emp["nd_hours"]:
                    issues.append(f"Night diff mismatch (PDF {pdf_emp['nd_hours']} vs DTR {entry.night_diff})")

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