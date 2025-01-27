#!/bin/bash
# wait-for-it.sh

set -e

echo "Waiting for MongoDB..."
until mongosh --host mongodb --eval "db.runCommand('ping').ok" --quiet; do
  echo "MongoDB is unavailable - sleeping"
  sleep 2
done

echo "MongoDB is up - executing command"
exec "$@"