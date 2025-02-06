#!/bin/bash

# Remove existing network if it exists
docker network rm pulse-flow_app_network || true

# Create network with proper labels
docker network create \
    --driver bridge \
    --label com.docker.compose.network=app_network \
    --label com.docker.compose.project=pulse-flow \
    --label com.docker.compose.version=2 \
    pulse-flow_app_network 