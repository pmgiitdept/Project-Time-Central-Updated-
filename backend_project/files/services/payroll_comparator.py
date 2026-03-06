from .payroll_parser import parse_payroll_pdf
from files.models import File, DTREntry
import re


def compute_dtr_totals_from_parsed_pages(parsed_pages, debug=None):
    """
    Compute totals from parsed DTR tables.
    """
    total_days = 0
    total_hours = 0
    total_ot = 0
    total_nd = 0

    for page_no, page in parsed_pages.items():
        tables = page.get("tables", [])

        if debug:
            debug(f"Processing page {page_no} tables")

        for table in tables:

            # Skip first 2 header rows
            rows = table[2:]

            for row in rows:
                try:
                    low = float(row[8] or 0)   # LOW column
                    ot = float(row[9] or 0)    # OT column
                    nd = float(row[13] or 0)   # ND column
                except Exception:
                    continue

                if low > 0:
                    total_days += 1

                total_hours += low
                total_ot += ot
                total_nd += nd

    totals = {
        "days": total_days,
        "hours": total_hours,
        "ot": total_ot,
        "nd": total_nd,
    }

    if debug:
        debug(f"DTR computed totals: {totals}")

    return totals


def compare_dtr_with_payroll_pdf(dtr_file, log_debug=None):
    """
    Compare DTR entries with the latest payroll PDF for the same owner.
    Updates DTREntry.mismatch_flag and DTREntry.status_flag accordingly.
    """

    def debug(msg):
        if log_debug:
            log_debug(msg)
        else:
            print(msg)

    def normalize_emp_no(emp_no):
        """Normalize employee number: digits only, strip spaces, pad to 5 digits."""
        if not emp_no:
            return None

        emp_no_str = re.sub(r"\D", "", str(emp_no))
        emp_no_str = emp_no_str.strip()

        if not emp_no_str:
            return None

        return emp_no_str.zfill(5)

    owner = dtr_file.uploaded_by
    debug(f"Comparing DTR for owner: {owner.username if owner else 'Unknown'}")

    # -------------------------------------------------
    # Find latest payroll PDF
    # -------------------------------------------------

    pdf_file = File.objects.filter(
        owner=owner,
        file__iendswith=".pdf"
    ).order_by("-uploaded_at").first()

    pdf_map = {}

    if not pdf_file:
        debug("No payroll PDF found for this owner")

    else:
        debug(f"Found Payroll PDF: {pdf_file.file.name}")

        pdf_employees = parse_payroll_pdf(pdf_file.file, log_debug=log_debug)

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

    # -------------------------------------------------
    # Compute DTR totals from parsed_pages
    # -------------------------------------------------

    parsed_pages = dtr_file.parsed_pages or {}
    dtr_totals = compute_dtr_totals_from_parsed_pages(parsed_pages, debug)

    # -------------------------------------------------
    # Compare each entry
    # -------------------------------------------------

    entries = DTREntry.objects.filter(dtr_file=dtr_file)

    debug(f"Found {entries.count()} DTR entries")

    for entry in entries:

        issues = []

        emp_no_normalized = normalize_emp_no(entry.employee_no)

        debug(f"Checking DTR emp: {emp_no_normalized}")

        pdf_emp = pdf_map.get(emp_no_normalized)

        if not pdf_emp:

            debug(
                f" → {entry.full_name} ({emp_no_normalized}) missing in Payroll PDF. "
                f"PDF keys: {list(pdf_map.keys())}"
            )

            issues.append("Missing in Payroll PDF")

        else:

            debug(f"""
===== DTR vs PAYROLL =====
Employee: {emp_no_normalized}

DTR TOTALS
Days: {dtr_totals['days']}
Hours: {dtr_totals['hours']}
OT: {dtr_totals['ot']}
ND: {dtr_totals['nd']}

PAYROLL TOTALS
Days: {pdf_emp['wrk_days']}
Hours: {pdf_emp['reg_hours']}
OT: {pdf_emp['ot_hours']}
ND: {pdf_emp['nd_hours']}
==========================
""")

            if float(dtr_totals["days"]) != float(pdf_emp["wrk_days"]):
                issues.append(
                    f"Days mismatch (PDF {pdf_emp['wrk_days']} vs DTR {dtr_totals['days']})"
                )

            if float(dtr_totals["hours"]) != float(pdf_emp["reg_hours"]):
                issues.append(
                    f"Hours mismatch (PDF {pdf_emp['reg_hours']} vs DTR {dtr_totals['hours']})"
                )

            if float(dtr_totals["ot"]) != float(pdf_emp["ot_hours"]):
                issues.append(
                    f"OT mismatch (PDF {pdf_emp['ot_hours']} vs DTR {dtr_totals['ot']})"
                )

            if float(dtr_totals["nd"]) != float(pdf_emp["nd_hours"]):
                issues.append(
                    f"Night diff mismatch (PDF {pdf_emp['nd_hours']} vs DTR {dtr_totals['nd']})"
                )

        entry.mismatch_flag = ", ".join(issues) if issues else ""
        entry.status_flag = "mismatch" if issues else "match"

        entry.save()

        if issues:
            debug(f" → Issues found: {issues}")
        else:
            debug(f" → No issues for {entry.full_name} ({emp_no_normalized})")