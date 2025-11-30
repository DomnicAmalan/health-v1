#!/bin/bash
set -e

# Configuration
LOCALSTACK_ENDPOINT="${AWS_S3_ENDPOINT:-http://localhost:4566}"
AWS_REGION="${AWS_REGION:-us-east-1}"
BUCKET_NAME="${AWS_S3_BUCKET:-health-storage}"

# Wait for LocalStack to be ready
echo "Waiting for LocalStack to be ready..."
until curl -f -s "${LOCALSTACK_ENDPOINT}/_localstack/health" > /dev/null 2>&1; do
    echo "Waiting for LocalStack..."
    sleep 2
done

echo "LocalStack is ready!"

# Set AWS CLI to use LocalStack
export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-test}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-test}"
export AWS_DEFAULT_REGION="${AWS_REGION}"

# Create S3 bucket
echo "Creating S3 bucket: ${BUCKET_NAME}"
aws --endpoint-url="${LOCALSTACK_ENDPOINT}" s3 mb "s3://${BUCKET_NAME}" 2>/dev/null || {
    echo "Bucket ${BUCKET_NAME} already exists or error occurred"
    # Check if bucket exists
    if aws --endpoint-url="${LOCALSTACK_ENDPOINT}" s3 ls "s3://${BUCKET_NAME}" > /dev/null 2>&1; then
        echo "Bucket ${BUCKET_NAME} already exists"
    fi
}

# Set bucket versioning (optional)
echo "Configuring bucket settings..."
aws --endpoint-url="${LOCALSTACK_ENDPOINT}" s3api put-bucket-versioning \
    --bucket "${BUCKET_NAME}" \
    --versioning-configuration Status=Enabled 2>/dev/null || true

# List buckets to verify
echo "Available S3 buckets:"
aws --endpoint-url="${LOCALSTACK_ENDPOINT}" s3 ls

echo ""
echo "LocalStack setup complete!"
echo "S3 endpoint: ${LOCALSTACK_ENDPOINT}"
echo "Bucket name: ${BUCKET_NAME}"
echo "Region: ${AWS_REGION}"

