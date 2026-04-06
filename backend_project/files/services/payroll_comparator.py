from .payroll_parser import parse_payroll_pdf
from files.models import PDFFile, DTREntry
import re
import traceback


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

    try:
        owner = dtr_file.uploaded_by
        debug(f"Comparing DTR for owner: {owner.username if owner else 'Unknown'}")

        # =========================
        # 1. PARSE DTR (SOURCE OF TRUTH)
        # =========================
        parsed_dtr = parse_payroll_pdf(dtr_file.file.path, log_debug=log_debug)

        dtr_start = parsed_dtr.get("period_start")
        dtr_end = parsed_dtr.get("period_end")

        debug(f"DTR Period (parsed): {dtr_start} → {dtr_end}")

        if not dtr_start or not dtr_end:
            debug("DTR file does not have a valid period")
            return

        # =========================
        # 2. GET PDF CANDIDATES
        # =========================
        pdf_candidates = PDFFile.objects.filter(
            uploaded_by=owner,
            file__iendswith=".pdf"
        ).exclude(start_date__isnull=True).exclude(end_date__isnull=True)

        parsed_pdf_cache = {}
        matching_pdfs = []

        # =========================
        # 3. PARSE ALL PDFs FIRST (CACHE)
        # =========================
        for pdf in pdf_candidates:
            debug(f"Parsing Payroll PDF: {pdf.file.name}")

            parsed_pdf_cache[pdf.id] = parse_payroll_pdf(
                pdf.file.path,
                log_debug=log_debug
            )

            parsed_pdf = parsed_pdf_cache[pdf.id]

            pdf_start = parsed_pdf.get("period_start")
            pdf_end = parsed_pdf.get("period_end")

            # Match against DTR period
            if pdf_start == dtr_start and pdf_end == dtr_end:
                matching_pdfs.append(pdf)

        # =========================
        # 4. HANDLE NO MATCH
        # =========================
        if not matching_pdfs:
            debug("No Payroll PDF found with matching period")

            entries = DTREntry.objects.filter(dtr_file=dtr_file)
            for entry in entries:
                entry.status_flag = "mismatch"
                entry.mismatch_flag = "Payroll PDF with same period not found"
                entry.save()

            return

        debug(f"Found {len(matching_pdfs)} matching Payroll PDFs")

        # =========================
        # 5. COMPARE ENTRIES
        # =========================
        entries = DTREntry.objects.filter(dtr_file=dtr_file)
        debug(f"Found {entries.count()} DTR entries")

        for entry in entries:
            issues = []
            emp_no_norm = normalize_emp_no(entry.employee_no)

            debug(f"Checking DTR emp: {emp_no_norm} ({entry.full_name})")

            pdf_emp = None

            # =========================
            # 6. SEARCH EMPLOYEE IN PDFs
            # =========================
            for pdf in matching_pdfs:
                parsed = parsed_pdf_cache[pdf.id]
                pdf_employees = parsed.get("employees", [])

                for emp in pdf_employees:
                    emp_pdf_no = normalize_emp_no(emp.get("employee_no"))

                    # fallback extraction from header
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

            # =========================
            # 7. COMPARISON LOGIC
            # =========================
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

            # =========================
            # 8. SAVE RESULTS
            # =========================
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