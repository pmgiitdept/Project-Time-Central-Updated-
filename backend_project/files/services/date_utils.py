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