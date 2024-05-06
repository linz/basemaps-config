#!/bin/bash

# Run the basemaps/cli as a docker container with all the extra environment vars and args passed in
# Specific for the basemaps server cmd with a port 5000
docker run \
  --name bms \
  -v ${PWD}:${PWD} \
  -p 5000:5000 \
  -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_SESSION_TOKEN -e AWS_REGION -e AWS_DEFAULT_REGION -e BASEMAPS_HOST \
  --rm \
  ghcr.io/linz/basemaps/cli:${BASEMAPS_CONTAINER_VERSION:-latest} \
  "$@"