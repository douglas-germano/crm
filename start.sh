#!/usr/bin/env bash
set -euo pipefail

cd backend
exec gunicorn run:app --bind "0.0.0.0:${PORT:-5001}" --workers 2 --timeout 120
