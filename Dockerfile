# Readit — production image (API + React SPA)
FROM node:20-alpine AS frontend-build

WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
# Same origin in production — API routes have no /api prefix
ENV VITE_API_BASE_URL=
RUN npm run build

FROM python:3.11-slim

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .
COPY --from=frontend-build /frontend/dist ./static

ENV DATABASE_URL=sqlite:////app/data/readit.db
ENV PYTHONUNBUFFERED=1

RUN mkdir -p /app/data /app/uploads \
    && chmod +x /app/entrypoint.sh \
    && python bootstrap_db.py --min-books 100

EXPOSE 8001

CMD ["/app/entrypoint.sh"]
