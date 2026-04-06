from .payroll_parser import parse_payroll_pdf
from .date_utils import parse_date_flexible
from files.models import PDFFile, DTREntry
import re
import traceback
from datetime import timedelta


def compare_dtr_with_payroll_pdf(dtr_file, log_debug=None):

    def debug(msg):
        prefix = "[DTR-PARSER DEBUG]"
        if log_debug:
            log_debug(f"{prefix} {msg}")
        else:
            print(f"{prefix} {msg}")

    def normalize_emp_no(emp_no):
        """Keep only digits and pad to 5 digits."""
        if not emp_no:
            return None
        emp_no_str = re.sub(r"\D", "", str(emp_no)).strip()
        return emp_no_str.zfill(5) if emp_no_str else None

    # ✅ CLEAN: now uses centralized parser
    def parse_payroll_period(date_val):
        if not date_val:
            return None, None

        end_date = parse_date_flexible(date_val)

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
        debug(f"DTR Period (normalized): {dtr_start} → {dtr_end}")

        if not dtr_start or not dtr_end:
            debug("DTR file does not have a valid period")
            return

        # --- GET MATCHING PDFs ---
        pdf_candidates = PDFFile.objects.filter(
            uploaded_by=owner,
            file__iendswith=".pdf"
        ).exclude(start_date__isnull=True).exclude(end_date__isnull=True)

        matching_pdfs = []

        for pdf in pdf_candidates:
            pdf_start, pdf_end = parse_payroll_period(pdf.end_date)

            if pdf_start == dtr_start and pdf_end == dtr_end:
                matching_pdfs.append(pdf)

        if not matching_pdfs:
            debug("No Payroll PDF found with matching period")

            entries = DTREntry.objects.filter(dtr_file=dtr_file)
            for entry in entries:
                entry.status_flag = "mismatch"
                entry.mismatch_flag = "Payroll PDF with same period not found"
                entry.save()

            return

        debug(f"Found {len(matching_pdfs)} matching Payroll PDFs")

        # ✅ PERFORMANCE FIX: parse PDFs ONCE
        parsed_pdf_cache = {}

        for pdf in matching_pdfs:
            debug(f"Parsing PDF once: {pdf.file.name}")
            parsed_pdf_cache[pdf.id] = parse_payroll_pdf(
                pdf.file.path,
                log_debug=log_debug
            )

        # --- COMPARE DTR ENTRIES ---
        entries = DTREntry.objects.filter(dtr_file=dtr_file)
        debug(f"Found {entries.count()} DTR entries")

        for entry in entries:
            issues = []
            emp_no_norm = normalize_emp_no(entry.employee_no)

            debug(f"Checking DTR emp: {emp_no_norm} ({entry.full_name})")

            pdf_emp = None

            # 🔍 SEARCH employee across parsed PDFs
            for pdf in matching_pdfs:
                parsed = parsed_pdf_cache[pdf.id]
                pdf_employees = parsed["employees"]

                for emp in pdf_employees:
                    emp_pdf_no = normalize_emp_no(emp.get("employee_no"))

                    if not emp_pdf_no:
                        header_line = emp.get("header_text_line") or ""
                        match = re.search(r"([A-Z]*)(\d{5})", header_line)
                        if match:
                            emp_pdf_no = normalize_emp_no(match.group(2))

                    if emp_pdf_no == emp_no_norm:
                        total_ot = sum(
                            float(ot or 0)
                            for ot, holiday in zip(
                                emp.get("ot_per_row", []),
                                emp.get("holiday_codes", [])
                            )
                            if holiday not in ["SHP", "LHP"]
                        )

                        pdf_emp = {
                            "wrk_days": float(emp.get("wrk_days") or 0),
                            "reg_hours": float(emp.get("reg_hours") or 0),
                            "ot_hours": total_ot,
                            "nd_hours": float(emp.get("nd_hours") or 0),
                            "full_name": emp.get("full_name") or "Unknown",
                        }
                        break

                if pdf_emp:
                    break

            # --- COMPARISON ---
            if not pdf_emp:
                issues.append("Missing in Payroll PDF")
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