# accounts/permissions.py
from rest_framework.permissions import BasePermission, SAFE_METHODS


class RolePermission(BasePermission):
    """Base class for role-based permission checks."""
    allowed_roles = []

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and
            request.user.role in self.allowed_roles
        )


class IsViewer(RolePermission):
    allowed_roles = ["viewer"]


class IsClient(RolePermission):
    allowed_roles = ["client"]


class IsAdmin(RolePermission):
    allowed_roles = ["admin"]


class ReadOnlyForViewer(BasePermission):
    """Viewers can only perform safe methods."""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.role == "viewer":
            return request.method in SAFE_METHODS
        return True


class IsOwnerOrAdmin(BasePermission):
    """Only the owner or admin can modify the object."""
    def has_object_permission(self, request, view, obj):
        return request.user.role == "admin" or obj.owner == request.user


class CanEditStatus(BasePermission):
    """Admins and viewers can update status; clients read-only."""
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return request.user.role in ["admin", "viewer"] and request.method == "PATCH"
