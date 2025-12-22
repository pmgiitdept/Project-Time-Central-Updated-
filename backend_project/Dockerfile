# Use Python slim image
FROM python:3.12-slim

# Set work directory
WORKDIR /app

# Prevent writing .pyc files & enable output
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libgl1 \
    poppler-utils \
    tesseract-ocr \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy project files
COPY . .

# Run Django with Daphne (ASGI)
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "backend_project.asgi:application"]
