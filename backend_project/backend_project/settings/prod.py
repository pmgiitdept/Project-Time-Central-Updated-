# backend_project/settings/prod.py
from .base import *

DEBUG = False

# Security
SECURE_HSTS_SECONDS = 3600
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="example.com", cast=lambda v: v.split(","))

# Use Redis for Channels in production
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [(config("REDIS_HOST", default="redis"), 6379)],
        },
    },
}
