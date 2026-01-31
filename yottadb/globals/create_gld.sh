#!/bin/bash
# Create YottaDB global directory
source /opt/yottadb/current/ydb_env_set

$ydb_dist/mumps -run GDE << GDEEOF
change -segment DEFAULT -file=/data/g/yottadb.dat
change -region DEFAULT -record_size=1048576
change -region DEFAULT -key_size=1019
exit
GDEEOF

$ydb_dist/mupip create
echo "Global directory created successfully"
