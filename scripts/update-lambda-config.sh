#!/bin/bash 
#
# Basemaps uses environment variables to know where to load config from
#
# This script looks up the current environment variables for the lambda
# then updates the config location to the new config location
#
# Parameters:
# - $BASEMAPS_CONFIG_LOCATION - location of the new configuration file
# - $BASEMAPS_LAMBDA_ARN - ARN of the lambda to update

if [ -z "$BASEMAPS_CONFIG_LOCATION" ]; then
    echo "Error: missing config location \$BASEMAPS_CONFIG_LOCATION"
    exit 1
fi

if [ -z "$BASEMAPS_LAMBDA_ARN" ]; then
    echo "Error: missing config location \$BASEMAPS_LAMBDA_ARN"
    exit 1
fi

# Get the Lambda function's current environment variables
existing_env_vars=$(aws lambda get-function-configuration \
    --region ap-southeast-2 \
    --function-name "$BASEMAPS_LAMBDA_ARN" \
    --query "Environment.Variables" \
    --output json)

current_location=$(echo "$existing_env_vars" | jq ".BASEMAPS_CONFIG_PATH")
# Use jq to update the configuration path
updated_env_vars=$(echo "$existing_env_vars" | jq ".BASEMAPS_CONFIG_PATH = \"${BASEMAPS_CONFIG_LOCATION}\"")

# Update the Lambda function with the modified environment variables
aws lambda update-function-configuration \
    --region ap-southeast-2 \
    --function-name "$BASEMAPS_LAMBDA_ARN" \
    --environment Variables="$updated_env_vars"

echo "Updated config location from: ${current_location} to ${BASEMAPS_CONFIG_LOCATION}"