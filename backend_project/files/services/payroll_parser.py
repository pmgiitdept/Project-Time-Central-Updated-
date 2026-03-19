import pdfplumber
import re

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

    # 🔥 FIXED & FLEXIBLE PERIOD EXTRACTOR
    def extract_payroll_period(text):
        if not text:
            return None, None

        # Normalize weird PDF artifacts
        text = text.replace("/-", "/")
        text = text.replace("\xa0", " ")  # non-breaking space
        text = text.replace("–", "-").replace("—", "-")  # unicode dashes
        text = re.sub(r"\s+", " ", text)  # collapse whitespace

        pattern = r"""
            (\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{4})
            \s*
            (?:to|TO|-)
            \s*
            (\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{4})
        """

        match = re.search(pattern, text, re.IGNORECASE | re.VERBOSE)

        if match:
            start = match.group(1).strip()
            end = match.group(2).strip()
            return start, end

        return None, None

    employees = []
    full_text = ""

    pdf_source = file_path_or_obj
    if not isinstance(file_path_or_obj, str):
        file_path_or_obj.seek(0)

    period_start_raw = None
    period_end_raw = None

    try:
        with pdfplumber.open(pdf_source) as pdf:

            debug(f"Opened PDF, total pages: {len(pdf.pages)}")

            for page_num, page in enumerate(pdf.pages, 1):

                text = page.extract_text()

                # 🔍 DEBUG (keep this!)
                debug(f"FULL PAGE TEXT (Page {page_num}):\n{text}")

                words = page.extract_words()
                debug(f"WORDS (Page {page_num}, first 20): {words[:20]}")

                if not text:
                    debug(f"Page {page_num} has no text, skipping")
                    continue

                full_text += "\n" + text

                # 🔥 FIX: check both start & end
                if not period_start_raw or not period_end_raw:
                    start, end = extract_payroll_period(text)
                    if start and end:
                        period_start_raw = start
                        period_end_raw = end
                        debug(f"Detected Payroll Period (page {page_num}): {start} → {end}")

                lines = text.splitlines()

                header_lines = [
                    l for l in lines
                    if (
                        "Employee No" in l
                        or "Daily Time Record" in l
                        or re.search(r"\d{4}[/-]\d{1,2}[/-]\d{1,2}", l)
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
                    debug(f"Page {page_num}: No employee number found, skipping")
                    continue

                tables = page.extract_tables() or []

                if not tables:
                    debug(f"Page {page_num}: No tables found")
                    continue

                for table in tables:

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

                    debug(
                        f"Page {page_num}: Parsed {emp_no} - {full_name} | "
                        f"Days: {total_days} REG: {reg_hours} OT: {ot_hours} ND: {nd_hours}"
                    )

        # 🔥 FINAL FALLBACK (whole document)
        if not period_start_raw or not period_end_raw:
            start, end = extract_payroll_period(full_text)
            if start and end:
                period_start_raw = start
                period_end_raw = end
                debug(f"Detected Payroll Period (fallback full text): {start} → {end}")

    except Exception as e:
        debug(f"Failed to open/parse PDF: {e}")

    debug(f"Total employees parsed: {len(employees)}")

    return {
        "employees": employees,
        "period_start_raw": period_start_raw,
        "period_end_raw": period_end_raw,
    }