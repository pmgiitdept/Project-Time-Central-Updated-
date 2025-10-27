import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from files.models import DTRFile
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

@pytest.mark.django_db
def test_list_dtr_files(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)
    response = api_client.get("/api/files/dtr/files/")  # ✅ correct URL
    assert response.status_code == 200

@pytest.mark.django_db
def test_upload_dtr_file(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)

    # In-memory Excel file
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
        format='multipart'
    )
    assert response.status_code == 201
    assert DTRFile.objects.exists()

@pytest.mark.django_db
def test_delete_dtr_file(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)
    
    # Dummy DTRFile entry
    dtr = DTRFile.objects.create(
        file=ContentFile(b"dummy content", "dummy.xlsx"),
        uploaded_by=admin_user
    )
    
    response = api_client.delete(f"/api/files/dtr/files/{dtr.id}/")
    assert response.status_code == 204
    assert not DTRFile.objects.filter(id=dtr.id).exists()
