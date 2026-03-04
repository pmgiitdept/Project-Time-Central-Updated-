# backend_project/settings/dev.py
from .base import *

DEBUG = True
ALLOWED_HOSTS = ["*"]

CHANNEL_LAYERS = {
    "default": {"BACKEND": "channels.layers.InMemoryChannelLayer"},
}

CORS_ALLOW_ALL_ORIGINS = True
