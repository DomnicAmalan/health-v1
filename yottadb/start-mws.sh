#!/bin/bash
# Start YottaDB M Web Server

set -e

# Initialize globals if needed
if [ ! -f /data/yottadb.gld ]; then
    echo "Initializing YottaDB global directory..."
    source /opt/yottadb/current/ydb_env_set
    $ydb_dist/mumps -run GDE <<EOF
change -segment DEFAULT -file=/data/g/yottadb.dat
exit
EOF
    $ydb_dist/mupip create
fi

# Source YottaDB environment
source /opt/yottadb/current/ydb_env_set

# Initialize VistA FileMan globals
echo "Initializing VistA globals..."
$ydb_dist/mumps -run ^INITVISTA

# Start the M Web Server
echo "Starting M Web Server on port ${MWS_PORT:-8080}..."
$ydb_dist/mumps -run ^MWSSTART
