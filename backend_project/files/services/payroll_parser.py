import pdfplumber


def parse_payroll_pdf(file_obj):
    """
    Extract employee rows from payroll PDF.
    Returns list of dictionaries.
    """

    employees = []

    def is_number(val):
        try:
            float(val)
            return True
        except:
            return False

    file_obj.seek(0)

    with pdfplumber.open(file_obj) as pdf:
        for page in pdf.pages:

            text = page.extract_text()
            if not text:
                continue

            lines = text.splitlines()

            header_idx = None
            for idx, line in enumerate(lines):
                if "Emp." in line and "DUTY" in line:
                    header_idx = idx
                    break

            if header_idx is None:
                continue

            data_lines = lines[header_idx + 1:]

            for dl in data_lines:
                parts = dl.split()

                if not parts or not parts[0].isdigit():
                    continue

                emp_no = parts[0]

                name_parts = []
                numbers = []
                found_number = False

                for p in parts[1:]:
                    if is_number(p):
                        found_number = True
                        numbers.append(float(p))
                    elif not found_number:
                        name_parts.append(p)

                name = " ".join(name_parts)

                while len(numbers) < 20:
                    numbers.append(0)

                employees.append({
                    "employee_no": emp_no,
                    "name": name,
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

    return employees