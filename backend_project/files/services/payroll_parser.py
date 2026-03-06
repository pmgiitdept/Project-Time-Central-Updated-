import pdfplumber
import re

def parse_payroll_pdf(file_path_or_obj, log_debug=None):
    """
    Extract employee rows from payroll PDF.
    Returns list of dictionaries:
      - employee_no (normalized)
      - full_name
      - wrk_days
      - reg_hours
      - ot_hours
      - nd_hours
    Works with both file paths (str) and Django FileField file-like objects.
    """

    def debug(msg):
        if log_debug:
            log_debug(f"[PAYROLL-PARSER DEBUG] {msg}")
        else:
            print(f"[PAYROLL-PARSER DEBUG] {msg}")

    def normalize_emp_no(emp_no):
        """Normalize employee number: remove non-digit chars and pad to 5 digits."""
        if not emp_no:
            return None
        emp_no_str = re.sub(r"\D", "", str(emp_no)).strip()
        return emp_no_str.zfill(5) if emp_no_str else None

    def extract_employee_info_from_header(header_lines):
        """Extract employee number and full name from PDF header lines."""
        emp_no = None
        full_name = None
        for line in header_lines:
            # Example: "Employee No. : PM03508 Name : Abad, Jonmark Caballero"
            m = re.search(r"Employee No\. ?: ?(PM?\d+).*Name ?: ?(.+)", line, re.I)
            if m:
                emp_no = normalize_emp_no(m.group(1))
                full_name = m.group(2).strip()
                break
        return emp_no, full_name

    employees = []

    # Determine if input is path or file-like
    if isinstance(file_path_or_obj, str):
        pdf_source = file_path_or_obj
    else:
        file_path_or_obj.seek(0)
        pdf_source = file_path_or_obj

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
                    debug(f"Page {page_num}: No employee number found, skipping")
                    continue

                tables = page.extract_tables() or []
                if not tables:
                    debug(f"Page {page_num}: No tables found, skipping")
                    continue

                # collect all tables first
                employee_tables = []

                for table in tables:
                    data_rows = table[2:] if len(table) > 2 else table
                    employee_tables.append(table)  # keep raw table for SHP/LHP OT calculation

                    # calculate totals
                    total_days = 0
                    reg_hours = 0
                    ot_hours = 0
                    nd_hours = 0

                    for row in data_rows:
                        if not row or len(row) < 14:
                            continue
                        try:
                            low = float(row[8] or 0)   # worked hours
                            ot = float(row[9] or 0)
                            nd = float(row[13] or 0)
                        except Exception:
                            debug(f"Page {page_num}: Failed to parse row {row}, skipping")
                            continue

                        if low > 0:
                            total_days += 1
                        reg_hours += low
                        ot_hours += ot
                        nd_hours += nd

                # append **one employee dict per PDF page/employee**
                employees.append({
                    "employee_no": emp_no,
                    "full_name": full_name or "Unknown",
                    "wrk_days": total_days,
                    "reg_hours": reg_hours,
                    "ot_hours": ot_hours,
                    "nd_hours": nd_hours,
                    "tables": employee_tables  # <-- include all tables for this employee
                })

                debug(f"Page {page_num}: Parsed {emp_no} - {full_name}, "
                    f"Days: {total_days}, REG: {reg_hours}, OT: {ot_hours}, ND: {nd_hours}")

    except Exception as e:
        debug(f"Failed to open/parse PDF: {e}")

    debug(f"Total employees parsed: {len(employees)}")
    return employees