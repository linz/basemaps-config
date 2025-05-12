#!/bin/bash

# Run the basemaps/cli as a docker container with all the extra environment vars and args passed in
docker run \
  --entrypoint node \
  -v ${PWD}:${PWD} \
  -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_SESSION_TOKEN -e AWS_REGION -e AWS_DEFAULT_REGION -e BASEMAPS_HOST \
  --rm \
  --network="host" \
  ghcr.io/linz/basemaps/cli:${BASEMAPS_CLI_CONTAINER_VERSION:-latest} \
  "$@"