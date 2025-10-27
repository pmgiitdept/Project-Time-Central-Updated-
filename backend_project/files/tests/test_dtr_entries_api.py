import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from files.models import DTRFile, DTREntry
from io import BytesIO
import openpyxl
from django.core.files.base import ContentFile

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def admin_user(db):
    return User.objects.create_superuser(username="admin", email="admin@test.com", password="admin123")

@pytest.fixture
def sample_dtr_file(admin_user, db):
    """Create a DTRFile object for entry association"""
    dtr_file = DTRFile.objects.create(
        file=ContentFile(b"dummy content", "dtr.xlsx"),
        uploaded_by=admin_user
    )
    return dtr_file

@pytest.mark.django_db
def test_list_dtr_entries(api_client, admin_user, sample_dtr_file):
    api_client.force_authenticate(user=admin_user)

    # Create sample entry
    DTREntry.objects.create(
        dtr_file=sample_dtr_file,
        full_name="John Doe",
        employee_no="001",
        shift="Day",
        time="08:00-17:00",
        daily_data={"2025-10-16": {"time_in": "08:00", "time_out": "17:00"}},
    )

    response = api_client.get("/api/files/dtr/entries/")  # ✅ add /api/ prefix
    assert response.status_code == 200
    assert len(response.data['results']) == 1


@pytest.mark.django_db
def test_upload_dtr_file_only(api_client, admin_user):
    """Test uploading a DTRFile, without expecting DTREntry objects yet."""
    api_client.force_authenticate(user=admin_user)

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["employee_code", "date", "time_in", "time_out"])
    ws.append(["001", "2025-10-16", "08:00", "17:00"])
    excel_file = BytesIO()
    wb.save(excel_file)
    excel_file.seek(0)

    response = api_client.post(
        "/api/files/dtr/files/",
        {"file": ContentFile(excel_file.read(), "dtr_test.xlsx")},
        format="multipart"
    )
    assert response.status_code == 201

    # Only check that DTRFile exists
    assert DTRFile.objects.exists()
