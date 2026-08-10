FROM python:3.11-slim

# Create a non-root user
RUN groupadd -r devlens && useradd -r -g devlens devlens

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY ./app ./app

# Set non-root user
USER devlens

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
