#!/bin/bash
set -e

KAFKA_BOOTSTRAP_SERVERS="${KAFKA_BOOTSTRAP_SERVERS:-localhost:9092}"

echo "Waiting for Kafka to be ready..."
RETRY_COUNT=0
MAX_RETRIES=30

until kafka-broker-api-versions --bootstrap-server "${KAFKA_BOOTSTRAP_SERVERS}" > /dev/null 2>&1; do
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo "Kafka failed to start after ${MAX_RETRIES} retries"
        exit 1
    fi
    echo "Waiting for Kafka... (${RETRY_COUNT}/${MAX_RETRIES})"
    sleep 2
    RETRY_COUNT=$((RETRY_COUNT + 1))
done

echo "Kafka is ready!"

# List existing topics
echo "Existing Kafka topics:"
kafka-topics --bootstrap-server "${KAFKA_BOOTSTRAP_SERVERS}" --list 2>/dev/null || {
    echo "Could not list topics (kafka CLI tools may not be installed)"
}

# Create common topics (optional - auto-creation is enabled)
echo ""
echo "Kafka setup complete!"
echo "Bootstrap servers: ${KAFKA_BOOTSTRAP_SERVERS}"
echo "Kafka UI: http://localhost:8081"

