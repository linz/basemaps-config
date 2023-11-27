#!/bin/bash

# Run the basemaps/cli as a docker container with all the extra environment vars and args passed in
docker run \
  -v ${PWD}:${PWD} \
  -p 5000:5000 \
  -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_SESSION_TOKEN -e AWS_REGION -e AWS_DEFAULT_REGION \
  ghcr.io/linz/basemaps/cli:v6 \
  "$@"