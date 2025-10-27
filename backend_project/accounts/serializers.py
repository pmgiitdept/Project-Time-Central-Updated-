# accounts/serializers.py
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User


class UserSerializer(serializers.ModelSerializer):
    """Serializer for general user data."""
    class Meta:
        model = User
        fields = [
            "id", "username", "email", "role",
            "is_active", "is_staff", "is_superuser",
            "last_login", "date_joined",
            "phone_number", "is_online", "last_seen",
        ]
        read_only_fields = ["is_staff", "is_superuser"]


class RegisterSerializer(serializers.ModelSerializer):
    """Serializer for registering new users."""
    password = serializers.CharField(
        write_only=True, required=True, validators=[validate_password]
    )
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ["username", "email", "password", "password2", "role", "phone_number"]

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password": "Passwords must match"})
        if "phone_number" in attrs:
            phone = attrs["phone_number"].strip()
            if phone and not phone.startswith("+"):
                raise serializers.ValidationError({"phone_number": "Must start with '+' and country code."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password2")
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user
