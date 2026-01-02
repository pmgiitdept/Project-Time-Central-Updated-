# backend_project/urls.py

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse
from accounts.views import MyTokenObtainPairView, user_stats
from files.views import file_stats, compare_employees

def health_check(request):
    """Simple endpoint to verify server is running."""
    return HttpResponse("✅ Project Time Central Backend is running!")

urlpatterns = [
    # Health check / root route
    path("", health_check, name="health_check"),
    path("api/health/", health_check, name="health_check_api"),

    # Admin panel
    path("admin/", admin.site.urls),

    # Auth & Accounts
    path("api/auth/", include("accounts.urls")),
    path("api/auth/login/", MyTokenObtainPairView.as_view(), name="token_obtain_pair"),

    # File-related APIs
    path("api/files/", include("files.urls")),
    path("api/file-stats/", file_stats, name="file_stats"),
    path("api/compare-employees/", compare_employees, name="compare_employees"),

    # User-related stats
    path("api/user-stats/", user_stats, name="user_stats"),

    # Chat & WebSocket API endpoints
    path("api/chat/", include("chat.urls")),
]

# Serve media files (only in development)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
