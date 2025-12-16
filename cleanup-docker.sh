#!/bin/bash
# Script to clean up Docker volumes and containers for removed services

echo "Cleaning up Docker volumes and containers for removed services..."

# Stop and remove containers
docker-compose down 2>/dev/null || true

# Remove volumes for deleted services
docker volume rm health-v1_postgres_sonar_data 2>/dev/null || true
docker volume rm health-v1_kafka_data 2>/dev/null || true
docker volume rm health-v1_sonarqube_data 2>/dev/null || true
docker volume rm health-v1_sonarqube_extensions 2>/dev/null || true
docker volume rm health-v1_sonarqube_logs 2>/dev/null || true
docker volume rm health-v1_localstack_data 2>/dev/null || true
docker volume rm health-v1_openbao_data 2>/dev/null || true

# Remove main database and vault volumes for fresh start
echo ""
echo "Removing main database and vault volumes for fresh start..."
docker volume rm health-v1_postgres_data 2>/dev/null || true
docker volume rm health-v1_rustyvault_data 2>/dev/null || true
docker volume rm health-v1_rustyvault_service_data 2>/dev/null || true

# Also try with different naming conventions
docker volume ls | grep -E "(postgres_sonar|kafka|sonarqube|localstack|openbao)" | awk '{print $2}' | xargs -r docker volume rm 2>/dev/null || true

echo ""
echo "Cleanup complete!"
echo ""
echo "To completely reset, you can also run:"
echo "  docker-compose down -v  # Remove all volumes"
echo "  docker system prune -a  # Remove all unused images, containers, networks"
