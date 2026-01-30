# =============================================================================
# MedGuardian Production Dockerfile
# =============================================================================
# Optimized for Flask-SocketIO with OpenCV and Tesseract OCR
# Key decisions:
#   - python:3.11-slim (glibc-based for OpenCV wheel compatibility)
#   - opencv-python-headless (no X11/GUI dependencies needed)
#   - eventlet worker class (async support for WebSockets)
#   - Single worker (Socket.IO sticky session requirement)
#   - Non-root user (security best practice)
# =============================================================================

FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FLASK_ENV=production

# Set working directory
WORKDIR /app

# -----------------------------------------------------------------------------
# Install system dependencies
# -----------------------------------------------------------------------------
# libgl1: OpenGL support (fallback for some OpenCV operations)
# libglib2.0-0, libsm6, libxext6, libxrender-dev: X11 libs for headless OpenCV
# tesseract-ocr + tesseract-ocr-eng: OCR engine with English language data
# netcat-openbsd: For database availability check in boot.sh
# libgomp1: OpenMP for parallel processing in OpenCV/NumPy
# -----------------------------------------------------------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# -----------------------------------------------------------------------------
# Create non-root user for security
# -----------------------------------------------------------------------------
# Running as root in containers is a security risk. Create a dedicated user.
# -----------------------------------------------------------------------------
RUN useradd -m -u 1000 appuser

# Copy requirements first for better Docker layer caching
COPY requirements.txt .

# Install Python dependencies
# --no-cache-dir reduces image size by not caching pip downloads
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY --chown=appuser:appuser . .

# Create necessary directories and set permissions
RUN mkdir -p instance temp logs reference_images && \
    chown -R appuser:appuser /app

# Make boot script executable
RUN chmod +x boot.sh

# Switch to non-root user
USER appuser

# Expose the application port
EXPOSE 5000

# Health check for container orchestrators
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/health')" || exit 1

# -----------------------------------------------------------------------------
# Use boot.sh as entrypoint
# -----------------------------------------------------------------------------
# boot.sh handles:
# 1. Waiting for database to be ready
# 2. Running Flask-Migrate upgrades
# 3. Starting Gunicorn with eventlet workers
# -----------------------------------------------------------------------------
ENTRYPOINT ["/app/boot.sh"]
