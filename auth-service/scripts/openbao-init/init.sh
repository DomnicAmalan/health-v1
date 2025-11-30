#!/bin/bash
set -e

# Wait for OpenBao to be ready
echo "Waiting for OpenBao to be ready..."
until curl -f -s "${VAULT_ADDR:-http://localhost:8200}/v1/sys/health" > /dev/null 2>&1; do
    echo "Waiting for OpenBao..."
    sleep 1
done

echo "OpenBao is ready!"

# Set Vault address and token
export VAULT_ADDR="${VAULT_ADDR:-http://localhost:8200}"
export VAULT_TOKEN="${VAULT_TOKEN:-dev-root-token}"

# Enable KV secrets engine at the mount path (default: secret)
MOUNT_PATH="${VAULT_MOUNT_PATH:-secret}"
echo "Enabling KV secrets engine at path: ${MOUNT_PATH}"

# Check if mount already exists
if vault secrets list | grep -q "^${MOUNT_PATH}/"; then
    echo "Mount path ${MOUNT_PATH} already exists"
else
    vault secrets enable -path=${MOUNT_PATH} -version=2 kv
    echo "Enabled KV secrets engine at ${MOUNT_PATH}"
fi

# Create a policy for the application to use
echo "Creating application policy..."
vault policy write health-app - <<EOF
path "${MOUNT_PATH}/data/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "${MOUNT_PATH}/metadata/*" {
  capabilities = ["list", "read", "delete"]
}
EOF

# Create a token for the application (optional - can use root token for dev)
APP_TOKEN=$(vault token create -policy=health-app -format=json | jq -r '.auth.client_token')
echo "Application token created: ${APP_TOKEN}"
echo "Set VAULT_TOKEN=${APP_TOKEN} in your .env file to use the application token"

echo "OpenBao initialization complete!"
echo "Mount path: ${MOUNT_PATH}"
echo "Application token: ${APP_TOKEN}"

