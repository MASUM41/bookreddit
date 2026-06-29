#!/bin/sh
set -e
mkdir -p /app/data /app/uploads
python bootstrap_db.py --min-books 100
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8001}"
