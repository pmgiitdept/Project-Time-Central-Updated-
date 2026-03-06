import pdfplumber
import re

def parse_payroll_pdf(file_obj, log_debug=None):
    """
    Extract employee rows from payroll PDF.
    Returns list of dictionaries.
    Works with PDFs where employee info is in header_text.
    """

    def debug(msg):
        if log_debug:
            log_debug(msg)
        else:
            print(msg)

    def normalize_emp_no(emp_no):
        """Normalize employee number: keep digits only, strip spaces, pad to 5 digits."""
        if not emp_no:
            return None
        emp_no_str = re.sub(r"\D", "", str(emp_no)).strip()
        return emp_no_str.zfill(5) if emp_no_str else None

    def extract_employee_info_from_header(header_lines):
        """Extract employee number and full name from header_text."""
        emp_no = None
        full_name = None
        for line in header_lines:
            m = re.search(r"Employee No\. ?: ?(PM?\d+).*Name ?: ?(.+)", line)
            if m:
                emp_no = m.group(1)
                full_name = m.group(2).strip()
                break
        emp_no = normalize_emp_no(emp_no)
        return emp_no, full_name

    employees = []
    file_obj.seek(0)

    with pdfplumber.open(file_obj) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            text = page.extract_text()
            if not text:
                debug(f"Page {page_num} has no text, skipping")
                continue

            # Extract header_text (lines starting with Employee No)
            lines = text.splitlines()
            header_lines = [l for l in lines if "Employee No" in l or "Daily Time Record" in l]

            emp_no, full_name = extract_employee_info_from_header(header_lines)
            if not emp_no:
                debug(f"Page {page_num}: No employee number found in header, skipping")
                continue

            # Extract table
            tables = page.extract_tables() or []
            if not tables:
                debug(f"Page {page_num}: No tables found, skipping")
                continue

            for table in tables:
                # Skip first 2 header rows
                data_rows = table[2:] if len(table) > 2 else []

                total_days = 0
                reg_hours = 0
                ot_hours = 0
                nd_hours = 0

                for row in data_rows:
                    try:
                        low = float(row[8] or 0)    # LOW
                        ot = float(row[9] or 0)     # OT
                        nd = float(row[13] or 0)    # ND
                    except Exception:
                        continue

                    if low > 0:
                        total_days += 1

                    reg_hours += low
                    ot_hours += ot
                    nd_hours += nd

                employees.append({
                    "employee_no": emp_no,
                    "full_name": full_name or "Unknown",
                    "wrk_days": total_days,
                    "reg_hours": reg_hours,
                    "ot_hours": ot_hours,
                    "nd_hours": nd_hours,
                })

                debug(f"Page {page_num}: Parsed employee {emp_no} - {full_name}")

    debug(f"Parsed {len(employees)} employees from PDF")
    return employees