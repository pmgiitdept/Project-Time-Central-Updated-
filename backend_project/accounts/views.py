# accounts/views.py

from datetime import timedelta
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.models import update_last_login
from django.db.models import Count, Q
from django.db.models.functions import TruncDay, TruncWeek, TruncMonth
from django.http import HttpResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User
from .serializers import UserSerializer, RegisterSerializer


# Timeout used for determining online status
ONLINE_TIMEOUT = timedelta(minutes=5)
User = get_user_model()

class AdminUserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Admins can view or delete user accounts.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]

    def delete(self, request, *args, **kwargs):
        user = self.get_object()

        # Prevent deleting yourself or the main superuser
        if user == request.user:
            return Response(
                {"error": "You cannot delete your own account."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if user.is_superuser:
            return Response(
                {"error": "Cannot delete superuser accounts."},
                status=status.HTTP_403_FORBIDDEN
            )

        username = user.username
        user.delete()
        return Response(
            {"message": f"User '{username}' deleted successfully."},
            status=status.HTTP_204_NO_CONTENT
        )
    
class RegisterView(generics.CreateAPIView):
    """
    Public registration endpoint for creating new users.
    """
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT serializer that adds role info and updates online status.
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user

        # Update online state & last seen
        user.is_online = True
        user.last_seen = timezone.now()
        user.save(update_fields=["is_online", "last_seen"])
        update_last_login(None, user)

        data.update({
            "role": user.role.lower(),
            "username": user.username,
        })
        return data

class MyTokenObtainPairView(TokenObtainPairView):
    """
    Custom token view using the above serializer.
    """
    serializer_class = MyTokenObtainPairSerializer

@api_view(["POST"])
@permission_classes([AllowAny])
def custom_login(request):
    """
    Legacy/simple login (bypasses JWT auth). Use only for testing.
    """
    username = request.data.get("username")
    password = request.data.get("password")

    if not username or not password:
        return Response({"detail": "Username and password required."}, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(username=username, password=password)
    if not user:
        return Response({"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)

    # Update online status
    user.is_online = True
    user.last_seen = timezone.now()
    user.save(update_fields=["is_online", "last_seen"])
    update_last_login(None, user)

    # Generate tokens manually
    refresh = RefreshToken.for_user(user)

    return Response({
        "refresh": str(refresh),
        "access": str(refresh.access_token),
        "username": user.username,
        "role": user.role,
        "last_login": user.last_login,
    })

class UserView(generics.RetrieveAPIView):
    """
    Authenticated users can view their own profile.
    """
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

class AdminUserListView(generics.ListAPIView):
    """
    Admins can view all users.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]

@api_view(["GET"])
@permission_classes([IsAdminUser])
def list_users(request):
    """
    Admin-only: Get all users with online/offline status.
    """
    now = timezone.now()
    users = User.objects.all()

    data = []
    for u in users:
        is_online = bool(
            u.is_online and u.last_seen and now - u.last_seen <= ONLINE_TIMEOUT
        )
        data.append({
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "role": u.role,
            "is_active": u.is_active,
            "last_login": u.last_login,
            "is_online": is_online,
            "last_seen": u.last_seen,
        })

    return Response(data)

@api_view(["GET"])
@permission_classes([IsAdminUser])
def user_stats(request):
    """
    Admins can view aggregated user statistics (daily, weekly, monthly).
    """
    period = request.query_params.get("period", "day")

    trunc = {
        "month": TruncMonth("date_joined"),
        "week": TruncWeek("date_joined"),
        "day": TruncDay("date_joined"),
    }.get(period, TruncDay("date_joined"))

    stats = (
        User.objects.annotate(period=trunc)
        .values("period")
        .annotate(active=Count("id", filter=Q(is_active=True)))
        .order_by("period")
    )

    return Response(stats)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def custom_logout(request):
    """
    Mark user as offline and record timestamp.
    """
    user = request.user
    user.is_online = False
    user.last_seen = timezone.now()
    user.save(update_fields=["is_online", "last_seen"])
    return Response({"message": "Logged out successfully"})

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def user_ping(request):
    """
    Update user's last_seen timestamp (used for real-time dashboards).
    """
    user = request.user
    user.is_online = True
    user.last_seen = timezone.now()
    user.save(update_fields=["last_seen", "is_online"])
    return Response({"status": "ok", "last_seen": user.last_seen})

@csrf_exempt
def create_test_admin(request):
    """
    Quick helper to generate a superuser for dev/testing.
    """
    username = "testadmin"
    email = "testadmin@example.com"
    password = "TestAdmin123!"

    if User.objects.filter(username=username).exists():
        return HttpResponse("Admin user already exists.")

    User.objects.create_superuser(
        username=username,
        email=email,
        password=password,
        role=User.Roles.ADMIN,
    )
    return HttpResponse(f"Admin user '{username}' created successfully!")
