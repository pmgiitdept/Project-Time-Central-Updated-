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
    """
    Safely extract the client's IP address from the request.
    Handles proxies via HTTP_X_FORWARDED_FOR.
    """
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        # Take the first IP in case of multiple forwarded IPs
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def log_action(user, action: str, status: str = "success", ip: Optional[str] = None) -> None:
    """
    Create an audit log entry for a given action.
    If user is not authenticated, stores None as user.
    """
    AuditLog.objects.create(
        user=user if getattr(user, "is_authenticated", False) else None,
        action=action,
        status=status,
        ip_address=ip,
    )


def send_rejection_sms(phone_number: str, file_name: str, use_mock: bool = True) -> bool:
    """
    Send SMS notification when a file is rejected.
    
    Args:
        phone_number: Recipient phone number
        file_name: Name of the rejected file
        use_mock: If True, logs the message instead of sending via Twilio
    
    Returns:
        True if message is sent (or logged in mock mode), False otherwise
    """
    message = f"Your uploaded file '{file_name}' has been rejected. Please check your account for details."

    if use_mock:
        logger.info(f"[MOCK SMS] To: {phone_number} | Message: {message}")
        print(f"[MOCK SMS] To: {phone_number} | Message: {message}")
        return True

    # Twilio credentials from environment
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


def extract_pdf_pages(file_path):
    pages = {}

    try:
        with pdfplumber.open(file_path) as pdf:
            print(f"📘 Extracting DTR data from {len(pdf.pages)} pages...")

            for i, page in enumerate(pdf.pages, start=1):
                page_data = {"header_text": [], "tables": []}

                # Extract all text lines
                text = page.extract_text() or ""
                lines = [line.strip() for line in text.split("\n") if line.strip()]

                for line in lines:
                    # ✅ Match "Daily Time Record for the period of ..."
                    match = re.search(
                        r"(daily\s*time\s*record\s*for\s*the\s*period\s*of\s*\d{1,2}\s*/\s*\d{1,2}\s*/\s*\d{4}\s*to\s*\d{1,2}\s*/\s*\d{1,2}\s*/\s*\d{4})",
                        line,
                        re.I,
                    )
                    if match:
                        clean_line = match.group(1).strip()

                        # ✅ Extract start and end date
                        date_match = re.search(
                            r"(\d{1,2}\s*/\s*\d{1,2}\s*/\s*\d{4})\s*to\s*(\d{1,2}\s*/\s*\d{1,2}\s*/\s*\d{4})",
                            clean_line,
                        )
                        if date_match:
                            start_date_str = date_match.group(1).replace(" ", "")
                            end_date_str = date_match.group(2).replace(" ", "")

                            # Convert to strings right away
                            page_data["start_date"] = start_date_str
                            page_data["end_date"] = end_date_str

                        page_data["header_text"].append(clean_line)
                        continue

                    if re.search(r"\bemployee\s*no\b", line, re.I):
                        page_data["header_text"].append(line.strip())
                        continue

                    if re.search(r"\bname\s*[:\-]", line, re.I):
                        page_data["header_text"].append(line.strip())
                        continue

                # ✅ Extract tables
                tables = page.extract_tables()
                if tables:
                    for t in tables:
                        if t and len(t) > 0:
                            page_data["tables"].append(t)

                pages[str(i)] = page_data
                print(f"✅ Page {i}: {len(page_data['header_text'])} headers, {len(page_data['tables'])} tables.")

    except Exception as e:
        print("❌ PDF extraction failed:", e)
        return None

    return pages
