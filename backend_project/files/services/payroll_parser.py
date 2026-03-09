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
        """Safely convert table value to float."""
        if val is None:
            return 0.0
        try:
            val = str(val).replace("\n", "").strip()
            return float(val) if val else 0.0
        except:
            return 0.0

    def extract_employee_info_from_header(header_lines):
        emp_no = None
        full_name = None
        for line in header_lines:
            m = re.search(r"Employee No\. ?: ?(PM?\d+).*Name ?: ?(.+)", line, re.I)
            if m:
                emp_no = normalize_emp_no(m.group(1))
                full_name = m.group(2).strip()
                break
        return emp_no, full_name

    employees = []

    pdf_source = file_path_or_obj
    if not isinstance(file_path_or_obj, str):
        file_path_or_obj.seek(0)

    try:
        with pdfplumber.open(pdf_source) as pdf:

            debug(f"Opened PDF, total pages: {len(pdf.pages)}")

            for page_num, page in enumerate(pdf.pages, 1):

                text = page.extract_text()
                if not text:
                    debug(f"Page {page_num} has no text, skipping")
                    continue

                lines = text.splitlines()
                header_lines = [l for l in lines if "Employee No" in l or "Daily Time Record" in l]

                emp_no, full_name = extract_employee_info_from_header(header_lines)

                if not emp_no:
                    debug(f"Page {page_num}: No employee number found")
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

                        # ND REG + ND OT
                        holiday = str(row[16] or "").strip().upper()

                        nd_reg = safe_float(row[13])
                        nd_ot = safe_float(row[14])
                        nd = nd_reg + nd_ot

                        # Apply same rule as OT: ignore ND if SHP or LHP
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

    except Exception as e:
        debug(f"Failed to open/parse PDF: {e}")

    debug(f"Total employees parsed: {len(employees)}")
    return employees