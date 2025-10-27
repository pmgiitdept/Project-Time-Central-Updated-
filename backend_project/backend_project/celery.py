# backend_project/celery.py
import os
from celery import Celery

# Set default Django settings module for 'celery' program
os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE",
    os.getenv("DJANGO_SETTINGS_MODULE", "backend_project.settings.dev")
)

app = Celery("backend_project")

# Load settings from Django configuration with "CELERY_" prefix
app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks from all registered Django app configs
app.autodiscover_tasks()


@app.task(bind=True)
def debug_task(self):
    """Simple debug task to verify Celery is running."""
    print(f"Request: {self.request!r}")
