import pdfplumber, re

def parse_payroll_pdf(file_obj, log_debug=None):
    """
    Extract employee rows from payroll PDF.
    Returns list of dictionaries.
    """

    def debug(msg):
        if log_debug:
            log_debug(msg)
        else:
            print(msg)

    def is_number(val):
        try:
            float(val)
            return True
        except:
            return False

    employees = []
    file_obj.seek(0)

    with pdfplumber.open(file_obj) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            text = page.extract_text()
            if not text:
                debug(f"Page {page_num} has no text, skipping")
                continue

            lines = text.splitlines()

            # Find header row (Emp. / DUTY)
            header_idx = None
            for idx, line in enumerate(lines):
                if "Emp." in line and "DUTY" in line:
                    header_idx = idx
                    break

            if header_idx is None:
                debug(f"Page {page_num} has no header row, skipping")
                continue

            data_lines = lines[header_idx + 1:]

            for dl in data_lines:
                parts = dl.split()
                if not parts:
                    continue

                # Employee number normalization: remove non-digits, pad to 5 digits
                emp_no_raw = parts[0]
                emp_no = re.sub(r"\D", "", emp_no_raw).zfill(5)
                if not emp_no:
                    continue

                # Extract name (all text until first number)
                name_parts = []
                numbers = []
                found_number = False

                for p in parts[1:]:
                    if is_number(p):
                        found_number = True
                        numbers.append(float(p))
                    elif not found_number:
                        name_parts.append(p)

                name = " ".join(name_parts) or "Unknown"

                # Pad numbers to prevent index errors
                while len(numbers) < 20:
                    numbers.append(0)

                employees.append({
                    "employee_no": emp_no,
                    "full_name": name,
                    "wrk_days": numbers[0],
                    "abs_days": numbers[1],
                    "lv_days": numbers[2],
                    "hol_days": numbers[3],
                    "res_days": numbers[4],
                    "late": numbers[5],
                    "ut": numbers[6],
                    "reg_hours": numbers[7],
                    "ot_hours": numbers[8],
                    "nd_hours": numbers[9],
                })

    debug(f"Parsed {len(employees)} employees from PDF")
    return employees