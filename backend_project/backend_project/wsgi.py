# backend_project/wsgi.py
"""
WSGI config for backend_project project.

This exposes the WSGI callable as a module-level variable named ``application``.
Typically used by Gunicorn or other WSGI servers in production.
"""

import os
from django.core.wsgi import get_wsgi_application

# Use environment variable, fallback to default if not provided
os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE",
    os.getenv("DJANGO_SETTINGS_MODULE", "backend_project.settings")
)

application = get_wsgi_application()
