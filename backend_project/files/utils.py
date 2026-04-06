# files/utils.py
import os
import logging
from typing import Optional
from .models import AuditLog
import pdfplumber
import re
from datetime import datetime

logger = logging.getLogger(__name__)


def get_client_ip(request) -> Optional[str]:
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def log_action(user, action: str, status: str = "success", ip: Optional[str] = None) -> None:
    if getattr(user, "is_authenticated", False):
        print(f"Logging action for {user.username}")
    else:
        print("Logging action for anonymous user")

    AuditLog.objects.create(
        user=user if getattr(user, "is_authenticated", False) else None,
        action=action,
        status=status,
        ip_address=ip,
    )


def send_rejection_sms(phone_number: str, file_name: str, use_mock: bool = True) -> bool:
    message = f"Your uploaded file '{file_name}' has been rejected. Please check your account for details."

    if use_mock:
        logger.info(f"[MOCK SMS] To: {phone_number} | Message: {message}")
        print(f"[MOCK SMS] To: {phone_number} | Message: {message}")
        return True

    account_sid = os.getenv("TWILIO_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    from_number = os.getenv("TWILIO_FROM")

    if not all([account_sid, auth_token, from_number]):
        logger.error("Twilio credentials not set in environment variables")
        return False

    try:
        from twilio.rest import Client
        client = Client(account_sid, auth_token)
        msg = client.messages.create(
            body=message,
            from_=from_number,
            to=phone_number
        )
        logger.info(f"Sent rejection SMS to {phone_number}, SID: {msg.sid}")
        return True
    except Exception as e:
        logger.error(f"Failed to send rejection SMS to {phone_number}: {str(e)}")
        return False


# =========================
# DATE NORMALIZATION (FIXED & ROBUST)
# =========================
# files/utils.py
import os
import logging
from typing import Optional
from .models import AuditLog
import pdfplumber
import re
from datetime import datetime

logger = logging.getLogger(__name__)


def get_client_ip(request) -> Optional[str]:
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def log_action(user, action: str, status: str = "success", ip: Optional[str] = None) -> None:
    if getattr(user, "is_authenticated", False):
        print(f"Logging action for {user.username}")
    else:
        print("Logging action for anonymous user")

    AuditLog.objects.create(
        user=user if getattr(user, "is_authenticated", False) else None,
        action=action,
        status=status,
        ip_address=ip,
    )


def send_rejection_sms(phone_number: str, file_name: str, use_mock: bool = True) -> bool:
    message = f"Your uploaded file '{file_name}' has been rejected. Please check your account for details."

    if use_mock:
        logger.info(f"[MOCK SMS] To: {phone_number} | Message: {message}")
        print(f"[MOCK SMS] To: {phone_number} | Message: {message}")
        return True

    account_sid = os.getenv("TWILIO_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    from_number = os.getenv("TWILIO_FROM")

    if not all([account_sid, auth_token, from_number]):
        logger.error("Twilio credentials not set in environment variables")
        return False

    try:
        from twilio.rest import Client
        client = Client(account_sid, auth_token)
        msg = client.messages.create(
            body=message,
            from_=from_number,
            to=phone_number
        )
        logger.info(f"Sent rejection SMS to {phone_number}, SID: {msg.sid}")
        return True
    except Exception as e:
        logger.error(f"Failed to send rejection SMS to {phone_number}: {str(e)}")
        return False


# =========================
# DATE NORMALIZATION (FIXED & ROBUST)
# =========================
def normalize_date(date_str: str):
    if not date_str:
        return None

    # keep raw for debugging safety
    date_str = date_str.strip()

    # NEW: handle "16 03 2026" or messy spacing
    space_match = re.match(r"(\d{1,2})\s+(\d{1,2})\s+(\d{2,4})", date_str)
    if space_match:
        day, month, year = space_match.groups()
        return f"{year}-{int(month):02d}-{int(day):02d}"

    # normalize internal separators
    cleaned = re.sub(r"\s+", "", date_str)

    formats = [
        "%m/%d/%Y",
        "%d/%m/%Y",
        "%m-%d-%Y",
        "%d-%m-%Y",
        "%Y-%m-%d",
    ]

    for fmt in formats:
        try:
            return datetime.strptime(cleaned, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue

    return None


# =========================
# FULL PDF EXTRACTION (ROBUST)
# =========================
def extract_pdf_pages(file_path):
    pages = {}

    try:
        with pdfplumber.open(file_path) as pdf:
            print(f"📘 Extracting DTR data from {len(pdf.pages)} pages...")

            for i, page in enumerate(pdf.pages, start=1):
                page_data = {
                    "header_text": [],
                    "tables": [],
                    "start_date": None,
                    "end_date": None,
                }

                text = page.extract_text() or ""
                lines = [line.strip() for line in text.split("\n") if line.strip()]

                # =========================
                # PASS 1: LINE MATCHING
                # =========================
                for line in lines:

                    # STRICT MATCH
                    strict_match = re.search(
                        r"(daily\s*time\s*record\s*for\s*the\s*period\s*of\s*"
                        r"\d{1,2}[\s\/\-]\d{1,2}[\s\/\-]\d{2,4}\s*to\s*"
                        r"\d{1,2}[\s\/\-]\d{1,2}[\s\/\-]\d{2,4})",
                        line,
                        re.I,
                    )

                    if strict_match:
                        clean_line = strict_match.group(1)

                        date_match = re.search(
                            r"(\d{1,2}[\s\/\-]\d{1,2}[\s\/\-]\d{2,4})\s*to\s*"
                            r"(\d{1,2}[\s\/\-]\d{1,2}[\s\/\-]\d{2,4})",
                            clean_line,
                            re.I,
                        )

                        if date_match:
                            page_data["start_date"] = normalize_date(date_match.group(1))
                            page_data["end_date"] = normalize_date(date_match.group(2))

                        page_data["header_text"].append(clean_line)
                        continue

                    # FLEXIBLE MATCH (FIXED "to" handling)
                    flexible_match = re.search(
                        r"(\d{1,2}[\s\/\-]\d{1,2}[\s\/\-]\d{2,4})\s*(?:to|-)\s*"
                        r"(\d{1,2}[\s\/\-]\d{1,2}[\s\/\-]\d{2,4})",
                        line,
                        re.I,
                    )

                    if flexible_match:
                        page_data["start_date"] = normalize_date(flexible_match.group(1))
                        page_data["end_date"] = normalize_date(flexible_match.group(2))

                        page_data["header_text"].append(line)
                        continue

                    if re.search(r"\bemployee\s*no\b", line, re.I):
                        page_data["header_text"].append(line)
                        continue

                    if re.search(r"\bname\s*[:\-]", line, re.I):
                        page_data["header_text"].append(line)
                        continue

                # =========================
                # TABLE EXTRACTION
                # =========================
                tables = page.extract_tables()
                if tables:
                    for t in tables:
                        if t and len(t) > 0:
                            page_data["tables"].append(t)

                # =========================
                # FALLBACK PARSING (ENHANCED)
                # =========================
                if not page_data["start_date"] or not page_data["end_date"]:
                    all_text = " ".join(lines)

                    fallback = re.search(
                        r"(\d{1,2}[\s\/\-]\d{1,2}[\s\/\-]\d{2,4}).{0,40}"
                        r"(?:to|-).{0,40}"
                        r"(\d{1,2}[\s\/\-]\d{1,2}[\s\/\-]\d{2,4})",
                        all_text,
                        re.I,
                    )

                    if fallback:
                        page_data["start_date"] = normalize_date(fallback.group(1))
                        page_data["end_date"] = normalize_date(fallback.group(2))

                pages[str(i)] = page_data

                print(
                    f"✅ Page {i}: "
                    f"{len(page_data['header_text'])} headers, "
                    f"{len(page_data['tables'])} tables "
                    f"(start={page_data['start_date']}, end={page_data['end_date']})"
                )

    except Exception as e:
        print("❌ PDF extraction failed:", e)
        return None

    return pages


# =========================
# FULL PDF EXTRACTION (ROBUST)
# =========================
def extract_pdf_pages(file_path):
    pages = {}

    try:
        with pdfplumber.open(file_path) as pdf:
            print(f"📘 Extracting DTR data from {len(pdf.pages)} pages...")

            for i, page in enumerate(pdf.pages, start=1):
                page_data = {
                    "header_text": [],
                    "tables": [],
                    "start_date": None,
                    "end_date": None,
                }

                text = page.extract_text() or ""
                lines = [line.strip() for line in text.split("\n") if line.strip()]

                # =========================
                # PASS 1: LINE MATCHING
                # =========================
                for line in lines:

                    # STRICT MATCH
                    strict_match = re.search(
                        r"(daily\s*time\s*record\s*for\s*the\s*period\s*of\s*"
                        r"\d{1,2}[\s\/\-]\d{1,2}[\s\/\-]\d{2,4}\s*to\s*"
                        r"\d{1,2}[\s\/\-]\d{1,2}[\s\/\-]\d{2,4})",
                        line,
                        re.I,
                    )

                    if strict_match:
                        clean_line = strict_match.group(1)

                        date_match = re.search(
                            r"(\d{1,2}[\s\/\-]\d{1,2}[\s\/\-]\d{2,4})\s*to\s*"
                            r"(\d{1,2}[\s\/\-]\d{1,2}[\s\/\-]\d{2,4})",
                            clean_line,
                            re.I,
                        )

                        if date_match:
                            page_data["start_date"] = normalize_date(date_match.group(1))
                            page_data["end_date"] = normalize_date(date_match.group(2))

                        page_data["header_text"].append(clean_line)
                        continue

                    # FLEXIBLE MATCH (FIXED "to" handling)
                    flexible_match = re.search(
                        r"(\d{1,2}[\s\/\-]\d{1,2}[\s\/\-]\d{2,4})\s*(?:to|-)\s*"
                        r"(\d{1,2}[\s\/\-]\d{1,2}[\s\/\-]\d{2,4})",
                        line,
                        re.I,
                    )

                    if flexible_match:
                        page_data["start_date"] = normalize_date(flexible_match.group(1))
                        page_data["end_date"] = normalize_date(flexible_match.group(2))

                        page_data["header_text"].append(line)
                        continue

                    if re.search(r"\bemployee\s*no\b", line, re.I):
                        page_data["header_text"].append(line)
                        continue

                    if re.search(r"\bname\s*[:\-]", line, re.I):
                        page_data["header_text"].append(line)
                        continue

                # =========================
                # TABLE EXTRACTION
                # =========================
                tables = page.extract_tables()
                if tables:
                    for t in tables:
                        if t and len(t) > 0:
                            page_data["tables"].append(t)

                # =========================
                # FALLBACK PARSING (ENHANCED)
                # =========================
                if not page_data["start_date"] or not page_data["end_date"]:
                    all_text = " ".join(lines)

                    fallback = re.search(
                        r"(\d{1,2}[\s\/\-]\d{1,2}[\s\/\-]\d{2,4}).{0,40}"
                        r"(?:to|-).{0,40}"
                        r"(\d{1,2}[\s\/\-]\d{1,2}[\s\/\-]\d{2,4})",
                        all_text,
                        re.I,
                    )

                    if fallback:
                        page_data["start_date"] = normalize_date(fallback.group(1))
                        page_data["end_date"] = normalize_date(fallback.group(2))

                pages[str(i)] = page_data

                print(
                    f"✅ Page {i}: "
                    f"{len(page_data['header_text'])} headers, "
                    f"{len(page_data['tables'])} tables "
                    f"(start={page_data['start_date']}, end={page_data['end_date']})"
                )

    except Exception as e:
        print("❌ PDF extraction failed:", e)
        return None

    return pages