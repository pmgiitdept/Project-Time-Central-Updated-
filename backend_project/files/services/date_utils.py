# services/date_utils.py

import re
from datetime import datetime

def normalize_date_string(date_str):
    if not date_str:
        return None

    date_str = str(date_str)

    # fix PDF artifacts
    date_str = date_str.replace("\xa0", " ")
    date_str = date_str.replace("–", "-").replace("—", "-")

    # normalize spaces
    date_str = re.sub(r"\s+", " ", date_str).strip()

    # 🔥 convert "16 03 2026" → "16/03/2026"
    date_str = re.sub(r"(\d{1,2})\s+(\d{1,2})\s+(\d{4})", r"\1/\2/\3", date_str)

    return date_str


def parse_date_flexible(date_str):
    if not date_str:
        return None

    date_str = normalize_date_string(date_str)

    formats = [
        "%d/%m/%Y",
        "%Y-%m-%d",
        "%m/%d/%Y",
        "%d-%m-%Y",
    ]

    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt).date()
        except:
            continue

    return None

def infer_period_from_table_and_upload(uploaded_at, table_rows):
    """
    Last-resort fallback:
    Infer payroll period using table day range + upload date.
    """

    if not table_rows:
        return None, None

    days = []

    for row in table_rows:
        if isinstance(row, list) and row and str(row[0]).isdigit():
            try:
                days.append(int(row[0]))
            except:
                pass

    if not days:
        return None, None

    start_day = min(days)
    end_day = max(days)

    upload_date = uploaded_at.date()

    # ALWAYS assume payroll belongs to previous month
    if upload_date.month == 1:
        year = upload_date.year - 1
        month = 12
    else:
        year = upload_date.year
        month = upload_date.month - 1

    start_date = datetime(year, month, start_day).date()
    end_date = datetime(year, month, end_day).date()

    return start_date, end_date