# files/serializers.py
from rest_framework import serializers
from .models import (
    File,
    AuditLog,
    SystemSettings,
    EmployeeDirectory,
    DTRFile,
    DTREntry,
    Employee,
    PDFFile,
)
from .utils import extract_pdf_pages
from datetime import datetime

class FileSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source="owner.username")

    class Meta:
        model = File
        fields = ["id", "owner", "file", "uploaded_at", "updated_at", "status"]


class FileStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = File
        fields = ["status"]


class AuditLogSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source="user.username")
    role = serializers.ReadOnlyField(source="user.role")

    class Meta:
        model = AuditLog
        fields = ["id", "user", "role", "action", "status", "ip_address", "timestamp"]


class SystemSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSettings
        fields = "__all__"


class EmployeeDirectorySerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeDirectory
        fields = "__all__"

    def to_representation(self, instance):
        """
        Format numeric fields to 2 decimal places for better readability.
        """
        data = super().to_representation(instance)
        numeric_fields = [
            "total_hours", "nd_reg_hrs", "absences", "tardiness", "undertime",
            "ot_regular", "nd_ot_reg", "ot_restday", "nd_restday", "ot_rest_excess",
            "nd_rest_excess", "ot_special_hday", "nd_special_hday", "ot_shday_excess",
            "nd_shday_excess", "ot_legal_holiday", "special_holiday", "ot_leghol_excess",
            "nd_leghol_excess", "ot_sh_on_rest", "nd_sh_on_rest", "ot_sh_on_rest_excess",
            "nd_sh_on_rest_excess", "leg_h_on_rest_day", "nd_leg_h_on_restday",
            "ot_leg_h_on_rest_excess", "nd_leg_h_on_rest_excess", "vacleave_applied",
            "sickleave_applied", "back_pay_vl", "back_pay_sl", "ot_regular_excess",
            "nd_ot_reg_excess", "legal_holiday", "nd_legal_holiday", "overnight_rate",
        ]

        for field in numeric_fields:
            value = data.get(field)
            if value is not None:
                try:
                    data[field] = f"{float(value):.2f}"
                except (ValueError, TypeError):
                    pass

        return data


class DTRFileSerializer(serializers.ModelSerializer):
    filename = serializers.SerializerMethodField()
    uploaded_by = serializers.SerializerMethodField()
    owner = serializers.CharField(source="uploaded_by.username", read_only=True)

    class Meta:
        model = DTRFile
        fields = [
            "id",
            "uploaded_by",
            "owner",
            "file",
            "filename",
            "uploaded_at",
            "status",
            "start_date",
            "end_date",
        ]
        read_only_fields = ["uploaded_by", "uploaded_at"]

    def get_filename(self, obj):
        return obj.file.name.split("/")[-1] if obj.file else None

    def get_uploaded_by(self, obj):
        return {
            "id": obj.uploaded_by.id,
            "username": obj.uploaded_by.username,
            "full_name": getattr(obj.uploaded_by, "full_name", obj.uploaded_by.username),
        }

class DTREntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = DTREntry
        fields = "__all__"

    def get_project(self, obj):
        uploader = getattr(obj.dtr_file, "uploaded_by", None)
        if not uploader:
            return "Unknown Project"

        if uploader.first_name or uploader.last_name:
            return f"{uploader.first_name} {uploader.last_name}".strip()
        return uploader.username or "Unknown Project"

class EmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = ["id", "employee_no", "employee_name", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

class PDFFileSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = PDFFile
        fields = "__all__"
        read_only_fields = ["uploaded_by", "uploaded_at", "parsed_pages"]

    def get_uploaded_by_name(self, obj):
        user = obj.uploaded_by
        if user:
            full_name = f"{user.first_name} {user.last_name}".strip()
            return full_name if full_name else user.username
        return "N/A"

    def create(self, validated_data):
        user = self.context["request"].user
        pdf_file = PDFFile.objects.create(uploaded_by=user, **validated_data)

        try:
            # 🧩 Wait until file is fully saved before reading
            file_path = pdf_file.file.path
            print("DEBUG PDF PATH:", file_path)

            parsed = extract_pdf_pages(file_path)
            if parsed:
                pdf_file.parsed_pages = parsed

                # ✅ Get the first page data to extract period
                first_page = parsed.get("1", {})
                start = first_page.get("start_date")
                end = first_page.get("end_date")

                if start and end:
                    pdf_file.start_date = start
                    pdf_file.end_date = end
                    pdf_file.readable_period = self.format_period(start, end)

                pdf_file.save()
                print(f"✅ Parsed {len(parsed)} pages successfully.")
            else:
                print("⚠️ No text found or failed to extract pages.")

        except Exception as e:
            print("❌ PDF parsing error:", e)

        return pdf_file

    def format_period(self, start, end):
        """Convert date strings like 01/08/2025 to 'Aug 1–15, 2025'."""
        try:
            start_dt = datetime.strptime(start, "%d/%m/%Y")
            end_dt = datetime.strptime(end, "%d/%m/%Y")

            if start_dt.month == end_dt.month and start_dt.year == end_dt.year:
                # Same month → "Aug 1–15, 2025"
                return f"{start_dt.strftime('%b')} {start_dt.day}–{end_dt.day}, {start_dt.year}"
            else:
                # Different months → "Aug 30 – Sep 15, 2025"
                return f"{start_dt.strftime('%b %d')} – {end_dt.strftime('%b %d, %Y')}"
        except Exception as e:
            print("⚠️ Failed to format period:", e)
            return f"{start} → {end}"