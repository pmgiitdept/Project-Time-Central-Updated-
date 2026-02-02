# files/models.py
from django.db import models
from django.conf import settings
from django.contrib.postgres.fields import JSONField  # if using Postgres

def user_directory_path(instance, filename):
    """Generate upload path: user_<id>/<filename>."""
    return f"user_{instance.owner.id}/{filename}"


class File(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    file = models.FileField(upload_to=user_directory_path)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    status = models.CharField(max_length=20, default="pending")
    parsed_content = models.JSONField(null=True, blank=True)

    def __str__(self):
        return f"{self.file.name} ({self.owner.username})"


class AuditLog(models.Model):
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, null=True, blank=True)
    action = models.CharField(max_length=255)
    status = models.CharField(max_length=20, default="success")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username if self.user else 'Unknown'} - {self.action} at {self.timestamp}"


class SystemSettings(models.Model):
    site_name = models.CharField(max_length=100, default="Project Time Central")
    max_file_size = models.IntegerField(default=50)
    allowed_types = models.JSONField(default=list)
    retention_days = models.IntegerField(default=30)
    require_verification = models.BooleanField(default=False)
    auto_archive = models.BooleanField(default=False)
    default_role = models.CharField(max_length=20, default="client")
    require_password_reset = models.BooleanField(default=False)
    auto_disable_inactive = models.IntegerField(default=0)
    log_downloads = models.BooleanField(default=False)
    max_login_attempts = models.IntegerField(default=5)
    enable_2fa = models.BooleanField(default=False)

    def __str__(self):
        return "System Settings"


class EmployeeDirectory(models.Model):
    employee_code = models.CharField(max_length=50, blank=True, null=True, unique=True)
    employee_name = models.CharField(max_length=255)
    date_covered = models.CharField(max_length=50, blank=True, null=True)

    total_hours = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    nd_reg_hrs = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    absences = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    tardiness = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    undertime = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    # OT and holidays
    ot_regular = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    nd_ot_reg = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    ot_restday = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    nd_restday = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    ot_rest_excess = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    nd_rest_excess = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    ot_special_hday = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    nd_special_hday = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    ot_shday_excess = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    nd_shday_excess = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    ot_legal_holiday = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    special_holiday = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    ot_leghol_excess = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    nd_leghol_excess = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    ot_sh_on_rest = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    nd_sh_on_rest = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    ot_sh_on_rest_excess = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    nd_sh_on_rest_excess = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    leg_h_on_rest_day = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    nd_leg_h_on_restday = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    ot_leg_h_on_rest_excess = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    nd_leg_h_on_rest_excess = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    vacleave_applied = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    sickleave_applied = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    back_pay_vl = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    back_pay_sl = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    ot_regular_excess = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    nd_ot_reg_excess = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    legal_holiday = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    nd_legal_holiday = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    overnight_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    project = models.CharField(max_length=255, null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.employee_code} - {self.employee_name}"


class DTRFile(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("verified", "Verified"),
        ("rejected", "Rejected"),
    ]

    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    file = models.FileField(upload_to="dtr/")
    uploaded_at = models.DateTimeField(auto_now_add=True)
    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    rejection_reason = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"DTR: {self.file.name}"


class DTREntry(models.Model):
    dtr_file = models.ForeignKey(DTRFile, on_delete=models.CASCADE, related_name="entries")
    sheet_name = models.CharField(max_length=100)
    full_name = models.CharField(max_length=150)
    employee_no = models.CharField(max_length=50, null=True, blank=True)
    position = models.CharField(max_length=100, blank=True, null=True)
    shift = models.CharField(max_length=50, blank=True, null=True)
    time = models.CharField(max_length=50, blank=True, null=True)
    daily_data = models.JSONField(default=dict)

    total_days = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    total_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    undertime_minutes = models.IntegerField(default=0)
    regular_ot = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    legal_holiday = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    unworked_reg_holiday = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    special_holiday = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    night_diff = models.DecimalField(max_digits=6, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.employee_no} - {self.full_name}"


class Employee(models.Model):
    employee_no = models.CharField(max_length=20, unique=True, db_index=True)
    employee_name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.employee_no} - {self.employee_name}"


class PDFFile(models.Model):
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    file = models.FileField(upload_to="pdfs/")
    uploaded_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default="pending")
    parsed_pages = models.JSONField(null=True, blank=True)  # store text per page

    # 🆕 Extracted DTR period fields
    start_date = models.CharField(max_length=20, blank=True, null=True)
    end_date = models.CharField(max_length=20, blank=True, null=True)
    readable_period = models.CharField(max_length=50, blank=True, null=True)

    updated_pdf = models.FileField(upload_to="updated_pdfs/", null=True, blank=True)

    def __str__(self):
        return f"PDF: {self.file.name}"

class ParsedDTR(models.Model):
    """
    Parsed DTR coming from frontend Excel parsing (fixed template, multi-sheet)
    """

    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="parsed_dtrs"
    )

    # --- Employee / Header Info ---
    employee_name = models.CharField(max_length=255)
    employee_no = models.CharField(max_length=50, db_index=True)
    department = models.CharField(max_length=100, blank=True, null=True)
    project = models.CharField(max_length=255, blank=True, null=True)

    period_from = models.DateField()
    period_to = models.DateField()

    time_from = models.CharField(max_length=20, blank=True, null=True)
    time_to = models.CharField(max_length=20, blank=True, null=True)
    rest_day = models.CharField(max_length=20, blank=True, null=True)
    time_shift = models.CharField(max_length=50, blank=True, null=True)

    sheet_name = models.CharField(max_length=50)

    # --- DTR Data ---
    days = models.JSONField(default=list)      # rows 17–32
    totals = models.JSONField(default=dict)    # summary cells

    status = models.CharField(
        max_length=20,
        choices=[
            ("pending", "Pending"),
            ("approved", "Approved"),
            ("rejected", "Rejected"),
        ],
        default="pending",
    )

    remarks = models.TextField(blank=True, null=True)

    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = (
            "employee_no",
            "period_from",
            "period_to",
            "sheet_name",
        )
        ordering = ["-uploaded_at"]

    def __str__(self):
        return f"{self.employee_no} | {self.period_from} - {self.period_to}"
