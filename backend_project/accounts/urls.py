# accounts/urls.py

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path("register/", views.RegisterView.as_view(), name="register"),
    path("login/", views.custom_login, name="custom_login"),
    path("logout/", views.custom_logout, name="custom_logout"),

    path("token/", views.MyTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    path("me/", views.UserView.as_view(), name="me"),
    path("ping/", views.user_ping, name="ping"),

    path("users/", views.list_users, name="list_users"),
    path("users/<int:pk>/", views.AdminUserDetailView.as_view(), name="user_detail"),

    path("user-stats/", views.user_stats, name="user_stats"),

    path("create-test-admin/", views.create_test_admin, name="create_test_admin"),
]
