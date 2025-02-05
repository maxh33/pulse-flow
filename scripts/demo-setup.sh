#!/bin/bash
# Quick demo setup script
echo "Setting up PulseFlow Demo..."

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Wait for services
echo "Waiting for services to be ready..."
sleep 30

# Insert sample data
npm run insert-sample-tweets

echo "Demo ready at:"
echo "Application: http://localhost:3000"
echo "Grafana: http://localhost:3001"
echo "Jenkins: http://localhost:8080" 