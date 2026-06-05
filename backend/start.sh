#!/usr/bin/env bash
set -euo pipefail

echo "Running database migrations..."
flask db upgrade
echo "Migrations complete."

exec gunicorn run:app --bind "0.0.0.0:${PORT:-5001}" --workers 2 --timeout 120
