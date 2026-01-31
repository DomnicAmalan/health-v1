#!/bin/bash
# Test YottaDB EHR API via direct MUMPS commands

CONTAINER="health-yottadb"

echo "=== YottaDB EHR Test ==="
echo ""

# Function to run MUMPS command
run_mumps() {
    docker exec $CONTAINER bash -c "
        source /opt/yottadb/current/ydb_env_set
        export ydb_routines=\"/data/r \$ydb_routines\"
        echo '$1' | yottadb -direct 2>/dev/null | grep -v '^YDB>'
    "
}

echo "1. List Patients (^DPT):"
echo "------------------------"
run_mumps 'ZWR ^DPT'
echo ""

echo "2. Get Patient 1:"
echo "-----------------"
run_mumps 'W "Name: ",$P($G(^DPT(1,0)),"^",1),! W "DOB: ",$P($G(^DPT(1,0)),"^",3),! W "MRN: ",$G(^DPT(1,991)),!'
echo ""

echo "3. List Problems (^AUPNPROB):"
echo "-----------------------------"
run_mumps 'ZWR ^AUPNPROB'
echo ""

echo "4. List Allergies (^GMRA):"
echo "--------------------------"
run_mumps 'ZWR ^GMRA'
echo ""

echo "5. Get Problems for Patient 1:"
echo "------------------------------"
run_mumps 'S IEN="" F  S IEN=$O(^AUPNPROB("C",1,IEN)) Q:IEN=""  W "Problem "_IEN_": ",$P($G(^AUPNPROB(IEN,0)),"^",1),!'
echo ""

echo "6. Get Allergies for Patient 1:"
echo "-------------------------------"
run_mumps 'S IEN="" F  S IEN=$O(^GMRA("C",1,IEN)) Q:IEN=""  W "Allergy "_IEN_": ",$P($G(^GMRA(IEN,0)),"^",1),!'
echo ""

echo "7. Create New Patient:"
echo "----------------------"
run_mumps '
N IEN,NAME S IEN=$P($G(^DPT(0)),"^",3)+1
S NAME="TEST,API"
S ^DPT(IEN,0)=NAME_"^M^20000101^111111111"
S ^DPT(IEN,991)="MRN-TEST"
S ^DPT("B",NAME,IEN)=""
S $P(^DPT(0),"^",3)=IEN,$P(^DPT(0),"^",4)=IEN
W "Created patient IEN: "_IEN,!'
echo ""

echo "8. Verify New Patient:"
echo "----------------------"
run_mumps 'S IEN=$O(^DPT(""),-1) W "Latest patient: ",$P($G(^DPT(IEN,0)),"^",1)," (IEN="_IEN_")",!'
echo ""

echo "=== Test Complete ==="
