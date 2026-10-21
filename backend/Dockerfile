FROM python:3.11-slim
WORKDIR /app/backend
COPY requirements-runtime.txt .
RUN pip install --no-cache-dir -r requirements-runtime.txt
COPY server.py seed.py ./
RUN mkdir uploads
EXPOSE 8001
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
