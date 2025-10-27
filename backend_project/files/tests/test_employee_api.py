import pytest
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from files.models import EmployeeDirectory
from django.contrib.auth import get_user_model

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def admin_user(db):
    return User.objects.create_superuser(username="admin", email="admin@test.com", password="admin123")

@pytest.mark.django_db
def test_list_employees(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)
    response = api_client.get("/api/files/employees/")
    assert response.status_code == 200

@pytest.mark.django_db
def test_add_employee(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)
    data = {"employee_code": "123", "employee_name": "John Doe"}
    response = api_client.post("/api/files/add-employee/", data, format="json")
    assert response.status_code == 200
    assert EmployeeDirectory.objects.filter(employee_code="00123").exists()

@pytest.mark.django_db
def test_update_employee(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)
    emp = EmployeeDirectory.objects.create(employee_code="00001", employee_name="Alice")
    data = {"employee_name": "Alice Updated"}
    response = api_client.put(f"/api/files/update-employee/{emp.employee_code}/", data, format="json")
    assert response.status_code == 200
    emp.refresh_from_db()
    assert emp.employee_name == "Alice Updated"

@pytest.mark.django_db
def test_delete_employee(api_client, admin_user):
    api_client.force_authenticate(user=admin_user)
    emp = EmployeeDirectory.objects.create(employee_code="00002", employee_name="Bob")
    response = api_client.delete(f"/api/files/delete-employee/{emp.employee_code}/")
    assert response.status_code == 204
    assert not EmployeeDirectory.objects.filter(employee_code="00002").exists()
