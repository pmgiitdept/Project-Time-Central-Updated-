# files/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    FileViewSet,
    AuditLogViewSet,
    SystemSettingsViewSet,
    DTRFileViewSet,
    DTREntryViewSet,
    dashboard_stats,
    export_files_report,
    file_stats,
    rejected_files,
    upload_employee_excel,
    list_employees,
    add_employee,
    update_employee,
    delete_employee,
    upload_basic_employees,
    flush_employee_data,
    backup_employee_directory,
    restore_employee_directory,
    PDFFileViewSet,
)

# DRF router setup
router = DefaultRouter()
router.register(r"files", FileViewSet, basename="file")
router.register(r"audit-logs", AuditLogViewSet, basename="auditlog")
router.register(r"settings", SystemSettingsViewSet, basename="systemsettings")
router.register(r"dtr/files", DTRFileViewSet, basename="dtrfile")
router.register(r"dtr/entries", DTREntryViewSet, basename="dtrentry")
router.register(r'pdfs', PDFFileViewSet, basename='pdffile')

# URL patterns
urlpatterns = [
    path("", include(router.urls)),

    # Dashboard & reports
    path("dashboard-stats/", dashboard_stats, name="dashboard-stats"),
    path("files-report/", export_files_report, name="files-report"),
    path("file-stats/", file_stats, name="file-stats"),
    path("rejected/", rejected_files, name="rejected-files"),

    # Employee management
    path("upload-employee-excel/", upload_employee_excel, name="upload-employee-excel"),
    path("employees/", list_employees, name="list-employees"),
    path("add-employee/", add_employee, name="add-employee"),
    path("update-employee/<str:employee_code>/", update_employee, name="update-employee"),
    path("delete-employee/<str:employee_code>/", delete_employee, name="delete-employee"),
    path("upload-basic-employees/", upload_basic_employees, name="upload-basic-employees"),
    path("employees/flush-data/", flush_employee_data, name="flush-employee-data"),
    path("employees/backup/", backup_employee_directory, name="backup-employee-directory"),
    path("employees/restore/", restore_employee_directory, name="restore-employee-directory"),
]
