import pdfplumber
import re
from datetime import datetime
from .date_utils import parse_date_flexible, infer_period_from_table_and_upload


def parse_payroll_pdf(file_path_or_obj, log_debug=None):

    def debug(msg):
        if log_debug:
            log_debug(f"[PAYROLL-PARSER DEBUG] {msg}")
        else:
            print(f"[PAYROLL-PARSER DEBUG] {msg}")

    def normalize_emp_no(emp_no):
        if not emp_no:
            return None
        emp_no_str = re.sub(r"\D", "", str(emp_no)).strip()
        return emp_no_str.zfill(5) if emp_no_str else None

    def safe_float(val):
        if val is None:
            return 0.0
        try:
            val = str(val).replace("\n", "").strip()
            return float(val) if val else 0.0
        except:
            return 0.0

    # =========================
    # PERIOD EXTRACTION (HEADER)
    # =========================
    def extract_payroll_period(text):
        if not text:
            return None, None

        text = text.replace("/-", "/")
        text = text.replace("\xa0", " ")
        text = text.replace("–", "-").replace("—", "-")
        text = re.sub(r"\s+", " ", text)

        pattern = r"""
            (
                \d{4}[/-]\d{1,2}[/-]\d{1,2} |
                \d{1,2}[/-]\d{1,2}[/-]\d{4} |
                \d{1,2}\s+\d{1,2}\s+\d{4}
            )
            \s*
            (?:to|TO|-)
            \s*
            (
                \d{4}[/-]\d{1,2}[/-]\d{1,2} |
                \d{1,2}[/-]\d{1,2}[/-]\d{4} |
                \d{1,2}\s+\d{1,2}\s+\d{4}
            )
        """

        match = re.search(pattern, text, re.IGNORECASE | re.VERBOSE)

        if match:
            start_raw = match.group(1).strip()
            end_raw = match.group(2).strip()

            start = parse_date_flexible(start_raw)
            end = parse_date_flexible(end_raw)

            return start, end

        return None, None

    # =========================
    # MAIN STORAGE
    # =========================
    employees = []
    full_text = ""

    period_start = None
    period_end = None

    # store table rows for fallback
    all_table_rows = []

    pdf_source = file_path_or_obj
    if not isinstance(file_path_or_obj, str):
        file_path_or_obj.seek(0)

    try:
        with pdfplumber.open(pdf_source) as pdf:

            debug(f"Opened PDF, total pages: {len(pdf.pages)}")

            for page_num, page in enumerate(pdf.pages, 1):

                text = page.extract_text()

                debug(f"FULL PAGE TEXT (Page {page_num}):\n{text}")

                if not text:
                    continue

                full_text += "\n" + text

                # =========================
                # 1. TRY HEADER PERIOD FIRST
                # =========================
                if not period_start or not period_end:
                    start, end = extract_payroll_period(text)
                    if start and end:
                        period_start = start
                        period_end = end
                        debug(f"Detected Payroll Period (HEADER): {start} → {end}")

                lines = text.splitlines()

                header_lines = [
                    l for l in lines
                    if (
                        "Employee No" in l
                        or "Daily Time Record" in l
                        or re.search(r"\d{4}[/-]\d{1,2}[/-]\d{1,2}", l)
                        or re.search(r"\d{1,2}\s+\d{1,2}\s+\d{4}", l)
                    )
                ]

                header_text = " ".join(header_lines)

                emp_no = None
                full_name = None

                match = re.search(
                    r"Employee\s*No\.?\s*:\s*([A-Z]*\d+).*?Name\s*:\s*(.+)",
                    header_text,
                    re.I
                )

                if match:
                    emp_no = normalize_emp_no(match.group(1))
                    full_name = match.group(2).strip()

                if not emp_no:
                    fallback_match = re.search(r"\b\d{3,6}\b", header_text)
                    if fallback_match:
                        emp_no = normalize_emp_no(fallback_match.group(0))
                        full_name = full_name or "Unknown"

                if not emp_no:
                    continue

                tables = page.extract_tables() or []

                for table in tables:

                    # keep full table for fallback logic
                    all_table_rows.extend(table)

                    data_rows = table[2:] if len(table) > 2 else table

                    total_days = 0
                    reg_hours = 0
                    ot_hours = 0
                    nd_hours = 0

                    holiday_codes = []
                    ot_per_row = []

                    for row in data_rows:

                        if not row or len(row) < 17:
                            continue

                        low = safe_float(row[8])
                        ot = safe_float(row[9])
                        holiday = str(row[16] or "").strip().upper()

                        nd_reg = safe_float(row[13])
                        nd_ot = safe_float(row[14])
                        nd = nd_reg + nd_ot

                        if holiday in ["SHP", "LHP"]:
                            nd = 0

                        if low > 0:
                            total_days += 1

                        reg_hours += low
                        ot_hours += ot
                        nd_hours += nd

                        holiday_codes.append(holiday)
                        ot_per_row.append(ot)

                    employees.append({
                        "employee_no": emp_no,
                        "full_name": full_name or "Unknown",
                        "wrk_days": total_days,
                        "reg_hours": reg_hours,
                        "ot_hours": ot_hours,
                        "nd_hours": nd_hours,
                        "holiday_codes": holiday_codes,
                        "ot_per_row": ot_per_row,
                    })

    except Exception as e:
        debug(f"Failed to parse PDF: {e}")

    # =========================
    # 2. FALLBACK PERIOD LOGIC
    # =========================
    if not period_start or not period_end:
        debug("Header period missing → using table + upload fallback")

        # try to infer from table
        period_start, period_end = infer_period_from_table_and_upload(
            uploaded_at=datetime.now(),
            table_rows=all_table_rows
        )

        if period_start and period_end:
            debug(f"Detected Payroll Period (TABLE FALLBACK): {period_start} → {period_end}")

    # =========================
    # RETURN FINAL STRUCTURE
    # =========================
    return {
        "employees": employees,
        "period_start": period_start,
        "period_end": period_end,
    }