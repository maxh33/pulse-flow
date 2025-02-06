#!/bin/bash

# Stop all containers
docker-compose -f docker-compose.prod.yml down --volumes --remove-orphans

# Remove specific containers if they exist
docker rm -f pulse-flow-app prometheus grafana || true

# Remove networks
docker network rm pulse-flow_app_network || true
docker network rm pulse-flow_default || true

# Remove any dangling images
docker image prune -f 