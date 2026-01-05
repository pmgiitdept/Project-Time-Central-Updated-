from .base import *
import os
import dj_database_url
from corsheaders.defaults import default_headers

DEBUG = False

# Hosts
ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "api.project-time-central.cloud").split(",")

# SSL behind Traefik
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Database
DATABASES = {
    'default': dj_database_url.config(
        default=os.getenv("DATABASE_URL")
    )
}

# Channels
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [(os.getenv("REDIS_URL", "redis://redis:6379/0"))],
        },
    },
}

# Celery
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://redis:6379/0")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://redis:6379/0")
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'

# CORS settings
INSTALLED_APPS += ['corsheaders']
MIDDLEWARE.insert(0, 'corsheaders.middleware.CorsMiddleware')

CORS_ALLOWED_ORIGINS = [
    "https://app.project-time-central.cloud",
]
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = list(default_headers) + ["Authorization"]

# JWT Cookies for production
from datetime import timedelta
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_COOKIE": "access_token",
    "AUTH_COOKIE_REFRESH": "refresh_token",
    "AUTH_COOKIE_SECURE": True,       # must be True for HTTPS
    "AUTH_COOKIE_HTTP_ONLY": True,
    "AUTH_COOKIE_PATH": "/",
    "AUTH_COOKIE_SAMESITE": "None",   # allow cross-site cookies
    "AUTH_COOKIE_DOMAIN": ".project-time-central.cloud",
}

# ============================
# COOKIE & CSRF FIX (REQUIRED)
# ============================

SESSION_COOKIE_DOMAIN = ".project-time-central.cloud"
CSRF_COOKIE_DOMAIN = ".project-time-central.cloud"

SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

SESSION_COOKIE_SAMESITE = "None"
CSRF_COOKIE_SAMESITE = "None"

CSRF_TRUSTED_ORIGINS = [
    "https://app.project-time-central.cloud",
    "https://api.project-time-central.cloud",
]
