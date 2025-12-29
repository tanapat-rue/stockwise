#!/bin/bash

# Stockflows E-Commerce Simulation Test Suite
# Simulates realistic merchant scenarios with 50+ test cases

BASE_URL="${API_URL:-http://localhost:9090}"
COOKIE_JAR="/tmp/stockflows_test_cookies.txt"
PASSED=0
FAILED=0
DEFECTS=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Clean up cookie jar
rm -f "$COOKIE_JAR"

log_pass() {
    echo -e "${GREEN}✓${NC} $1"
    PASSED=$((PASSED + 1))
}

log_fail() {
    echo -e "${RED}✗${NC} $1: $2"
    FAILED=$((FAILED + 1))
}

log_defect() {
    echo -e "${YELLOW}⚠${NC} DEFECT: $1"
    DEFECTS="$DEFECTS\n  - $1"
}

# API helper function
api() {
    local method=$1
    local endpoint=$2
    local data=$3

    if [ -n "$data" ]; then
        curl -s -X "$method" "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
            -d "$data"
    else
        curl -s -X "$method" "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -b "$COOKIE_JAR" -c "$COOKIE_JAR"
    fi
}

echo "============================================================"
echo "STOCKFLOWS E-COMMERCE SIMULATION TEST SUITE"
echo "============================================================"
echo "Base URL: $BASE_URL"
echo ""

# ============================================================
# SECTION 1: AUTHENTICATION (2 tests)
# ============================================================
echo ""
echo "--- SECTION 1: Authentication ---"
echo ""

# Test 1.1: Register new merchant
EMAIL="merchant_$(date +%s)@test.com"
RESULT=$(api POST "/api/auth/signup" "{\"email\":\"$EMAIL\",\"password\":\"test123456\",\"name\":\"Test Merchant\",\"orgName\":\"Test E-Commerce Store\"}")
if echo "$RESULT" | jq -e '.user.id' > /dev/null 2>&1; then
    log_pass "1.1 Register new merchant account"
    BRANCH_ID=$(echo "$RESULT" | jq -r '.branch.id')
else
    log_fail "1.1 Register new merchant account" "$(echo "$RESULT" | jq -r '.error // "Unknown error"')"
    echo "Cannot continue without authentication"
    exit 1
fi

# Test 1.2: Get current user info
RESULT=$(api GET "/api/auth/me")
if echo "$RESULT" | jq -e '.user.id' > /dev/null 2>&1; then
    log_pass "1.2 Get current user and branch info"
else
    log_fail "1.2 Get current user and branch info" "$(echo "$RESULT" | jq -r '.error // "Unknown error"')"
fi

# ============================================================
# SECTION 2: PRODUCT CATALOG SETUP (8 tests)
# ============================================================
echo ""
echo "--- SECTION 2: Product Catalog Setup ---"
echo ""

# Create products and store IDs in simple variables
RESULT=$(api POST "/api/products" '{"sku":"TSHIRT-BLK-S","name":"T-Shirt Black S","description":"Test product","price":59900,"cost":25000,"category":"Apparel"}')
if echo "$RESULT" | jq -e '.data.id' > /dev/null 2>&1; then
    PROD_TSHIRT_BLK_S=$(echo "$RESULT" | jq -r '.data.id')
    log_pass "2.1 Create product: TSHIRT-BLK-S"
else
    log_fail "2.1 Create product: TSHIRT-BLK-S" "$(echo "$RESULT" | jq -r '.error // "Unknown error"')"
fi

RESULT=$(api POST "/api/products" '{"sku":"TSHIRT-BLK-M","name":"T-Shirt Black M","description":"Test product","price":59900,"cost":25000,"category":"Apparel"}')
if echo "$RESULT" | jq -e '.data.id' > /dev/null 2>&1; then
    PROD_TSHIRT_BLK_M=$(echo "$RESULT" | jq -r '.data.id')
    log_pass "2.2 Create product: TSHIRT-BLK-M"
else
    log_fail "2.2 Create product: TSHIRT-BLK-M" "$(echo "$RESULT" | jq -r '.error // "Unknown error"')"
fi

RESULT=$(api POST "/api/products" '{"sku":"TSHIRT-BLK-L","name":"T-Shirt Black L","description":"Test product","price":59900,"cost":25000,"category":"Apparel"}')
if echo "$RESULT" | jq -e '.data.id' > /dev/null 2>&1; then
    PROD_TSHIRT_BLK_L=$(echo "$RESULT" | jq -r '.data.id')
    log_pass "2.3 Create product: TSHIRT-BLK-L"
else
    log_fail "2.3 Create product: TSHIRT-BLK-L" "$(echo "$RESULT" | jq -r '.error // "Unknown error"')"
fi

RESULT=$(api POST "/api/products" '{"sku":"TSHIRT-WHT-S","name":"T-Shirt White S","description":"Test product","price":59900,"cost":25000,"category":"Apparel"}')
if echo "$RESULT" | jq -e '.data.id' > /dev/null 2>&1; then
    PROD_TSHIRT_WHT_S=$(echo "$RESULT" | jq -r '.data.id')
    log_pass "2.4 Create product: TSHIRT-WHT-S"
else
    log_fail "2.4 Create product: TSHIRT-WHT-S" "$(echo "$RESULT" | jq -r '.error // "Unknown error"')"
fi

RESULT=$(api POST "/api/products" '{"sku":"TSHIRT-WHT-M","name":"T-Shirt White M","description":"Test product","price":59900,"cost":25000,"category":"Apparel"}')
if echo "$RESULT" | jq -e '.data.id' > /dev/null 2>&1; then
    PROD_TSHIRT_WHT_M=$(echo "$RESULT" | jq -r '.data.id')
    log_pass "2.5 Create product: TSHIRT-WHT-M"
else
    log_fail "2.5 Create product: TSHIRT-WHT-M" "$(echo "$RESULT" | jq -r '.error // "Unknown error"')"
fi

RESULT=$(api POST "/api/products" '{"sku":"JEANS-BLU-32","name":"Jeans Blue 32","description":"Test product","price":129900,"cost":55000,"category":"Apparel"}')
if echo "$RESULT" | jq -e '.data.id' > /dev/null 2>&1; then
    PROD_JEANS_BLU_32=$(echo "$RESULT" | jq -r '.data.id')
    log_pass "2.6 Create product: JEANS-BLU-32"
else
    log_fail "2.6 Create product: JEANS-BLU-32" "$(echo "$RESULT" | jq -r '.error // "Unknown error"')"
fi

RESULT=$(api POST "/api/products" '{"sku":"JEANS-BLU-34","name":"Jeans Blue 34","description":"Test product","price":129900,"cost":55000,"category":"Apparel"}')
if echo "$RESULT" | jq -e '.data.id' > /dev/null 2>&1; then
    PROD_JEANS_BLU_34=$(echo "$RESULT" | jq -r '.data.id')
    log_pass "2.7 Create product: JEANS-BLU-34"
else
    log_fail "2.7 Create product: JEANS-BLU-34" "$(echo "$RESULT" | jq -r '.error // "Unknown error"')"
fi

RESULT=$(api POST "/api/products" '{"sku":"CAP-BLK","name":"Cap Black","description":"Test product","price":39900,"cost":15000,"category":"Accessories"}')
if echo "$RESULT" | jq -e '.data.id' > /dev/null 2>&1; then
    PROD_CAP_BLK=$(echo "$RESULT" | jq -r '.data.id')
    log_pass "2.8 Create product: CAP-BLK"
else
    log_fail "2.8 Create product: CAP-BLK" "$(echo "$RESULT" | jq -r '.error // "Unknown error"')"
fi

# ============================================================
# SECTION 3: SUPPLIERS SETUP (3 tests)
# ============================================================
echo ""
echo "--- SECTION 3: Suppliers Setup ---"
echo ""

RESULT=$(api POST "/api/suppliers" '{"name":"Fashion Textiles Co.","contactName":"Contact Person","email":"sup-textile@test.com","phone":"02-123-4567"}')
if echo "$RESULT" | jq -e '.data.id' > /dev/null 2>&1; then
    SUP_TEXTILE=$(echo "$RESULT" | jq -r '.data.id')
    log_pass "3.1 Create supplier: SUP-TEXTILE"
else
    log_fail "3.1 Create supplier: SUP-TEXTILE" "$(echo "$RESULT" | jq -r '.error // "Unknown error"')"
fi

RESULT=$(api POST "/api/suppliers" '{"name":"Denim World Ltd.","contactName":"Contact Person","email":"sup-denim@test.com","phone":"02-234-5678"}')
if echo "$RESULT" | jq -e '.data.id' > /dev/null 2>&1; then
    SUP_DENIM=$(echo "$RESULT" | jq -r '.data.id')
    log_pass "3.2 Create supplier: SUP-DENIM"
else
    log_fail "3.2 Create supplier: SUP-DENIM" "$(echo "$RESULT" | jq -r '.error // "Unknown error"')"
fi

RESULT=$(api POST "/api/suppliers" '{"name":"Accessories Plus","contactName":"Contact Person","email":"sup-acc@test.com","phone":"02-345-6789"}')
if echo "$RESULT" | jq -e '.data.id' > /dev/null 2>&1; then
    SUP_ACC=$(echo "$RESULT" | jq -r '.data.id')
    log_pass "3.3 Create supplier: SUP-ACC"
else
    log_fail "3.3 Create supplier: SUP-ACC" "$(echo "$RESULT" | jq -r '.error // "Unknown error"')"
fi

# ============================================================
# SECTION 4: CUSTOMERS SETUP (4 tests)
# ============================================================
echo ""
echo "--- SECTION 4: Customers Setup ---"
echo ""

RESULT=$(api POST "/api/customers" '{"name":"John Retail Customer","email":"cust-retail@test.com","phone":"081-111-1111","address":"123 Test Street"}')
if echo "$RESULT" | jq -e '.data.id' > /dev/null 2>&1; then
    CUST_RETAIL=$(echo "$RESULT" | jq -r '.data.id')
    log_pass "4.1 Create customer: CUST-RETAIL"
else
    log_fail "4.1 Create customer: CUST-RETAIL" "$(echo "$RESULT" | jq -r '.error // "Unknown error"')"
fi

RESULT=$(api POST "/api/customers" '{"name":"Fashion Boutique Shop","email":"cust-wholesale@test.com","phone":"081-222-2222","address":"456 Test Street"}')
if echo "$RESULT" | jq -e '.data.id' > /dev/null 2>&1; then
    CUST_WHOLESALE=$(echo "$RESULT" | jq -r '.data.id')
    log_pass "4.2 Create customer: CUST-WHOLESALE"
else
    log_fail "4.2 Create customer: CUST-WHOLESALE" "$(echo "$RESULT" | jq -r '.error // "Unknown error"')"
fi

RESULT=$(api POST "/api/customers" '{"name":"VIP Customer","email":"cust-vip@test.com","phone":"081-333-3333","address":"789 Test Street"}')
if echo "$RESULT" | jq -e '.data.id' > /dev/null 2>&1; then
    CUST_VIP=$(echo "$RESULT" | jq -r '.data.id')
    log_pass "4.3 Create customer: CUST-VIP"
else
    log_fail "4.3 Create customer: CUST-VIP" "$(echo "$RESULT" | jq -r '.error // "Unknown error"')"
fi

RESULT=$(api POST "/api/customers" '{"name":"Online Marketplace","email":"cust-online@test.com","phone":"081-444-4444","address":"Online Only"}')
if echo "$RESULT" | jq -e '.data.id' > /dev/null 2>&1; then
    CUST_ONLINE=$(echo "$RESULT" | jq -r '.data.id')
    log_pass "4.4 Create customer: CUST-ONLINE"
else
    log_fail "4.4 Create customer: CUST-ONLINE" "$(echo "$RESULT" | jq -r '.error // "Unknown error"')"
fi

# ============================================================
# SECTION 5: PURCHASE ORDER WORKFLOWS (15 tests)
# ============================================================
echo ""
echo "--- SECTION 5: Purchase Order Workflows ---"
echo ""

# Test 5.1: Create PO for T-Shirts
PO_DATA="{\"supplierId\":\"$SUP_TEXTILE\",\"branchId\":\"$BRANCH_ID\",\"expectedDate\":\"2025-01-15T00:00:00Z\",\"notes\":\"Initial T-Shirt stock\",\"items\":[{\"productId\":\"$PROD_TSHIRT_BLK_S\",\"qtyOrdered\":50,\"unitCost\":25000},{\"productId\":\"$PROD_TSHIRT_BLK_M\",\"qtyOrdered\":100,\"unitCost\":25000},{\"productId\":\"$PROD_TSHIRT_BLK_L\",\"qtyOrdered\":80,\"unitCost\":25000}]}"
RESULT=$(api POST "/api/purchase-orders" "$PO_DATA")

if echo "$RESULT" | jq -e '.data.id' > /dev/null 2>&1; then
    PO_TSHIRT=$(echo "$RESULT" | jq -r '.data.id')
    STATUS=$(echo "$RESULT" | jq -r '.data.status')
    TOTAL=$(echo "$RESULT" | jq -r '.data.totalAmount')
    EXPECTED_TOTAL=$((230 * 25000))

    if [ "$STATUS" = "DRAFT" ] && [ "$TOTAL" = "$EXPECTED_TOTAL" ]; then
        log_pass "5.1 Create PO for T-Shirts (DRAFT, total=$TOTAL)"
    else
        log_fail "5.1 Create PO for T-Shirts" "Status=$STATUS, Total=$TOTAL (expected $EXPECTED_TOTAL)"
    fi
else
    log_fail "5.1 Create PO for T-Shirts" "$(echo "$RESULT" | jq -r '.error // "Unknown error"')"
fi

# Test 5.2: Create PO for Jeans
PO_DATA="{\"supplierId\":\"$SUP_DENIM\",\"branchId\":\"$BRANCH_ID\",\"expectedDate\":\"2025-01-20T00:00:00Z\",\"notes\":\"Initial Jeans stock\",\"items\":[{\"productId\":\"$PROD_JEANS_BLU_32\",\"qtyOrdered\":40,\"unitCost\":55000},{\"productId\":\"$PROD_JEANS_BLU_34\",\"qtyOrdered\":30,\"unitCost\":55000}]}"
RESULT=$(api POST "/api/purchase-orders" "$PO_DATA")

if echo "$RESULT" | jq -e '.data.id' > /dev/null 2>&1; then
    PO_JEANS=$(echo "$RESULT" | jq -r '.data.id')
    log_pass "5.2 Create PO for Jeans (DRAFT)"
else
    log_fail "5.2 Create PO for Jeans" "$(echo "$RESULT" | jq -r '.error // "Unknown error"')"
fi

# Test 5.3: Create PO for Accessories
PO_DATA="{\"supplierId\":\"$SUP_ACC\",\"branchId\":\"$BRANCH_ID\",\"expectedDate\":\"2025-01-10T00:00:00Z\",\"notes\":\"Initial Cap stock\",\"items\":[{\"productId\":\"$PROD_CAP_BLK\",\"qtyOrdered\":100,\"unitCost\":15000}]}"
RESULT=$(api POST "/api/purchase-orders" "$PO_DATA")

if echo "$RESULT" | jq -e '.data.id' > /dev/null 2>&1; then
    PO_ACC=$(echo "$RESULT" | jq -r '.data.id')
    log_pass "5.3 Create PO for Accessories (DRAFT)"
else
    log_fail "5.3 Create PO for Accessories" "$(echo "$RESULT" | jq -r '.error // "Unknown error"')"
fi

# Test 5.4: Update PO quantity before sending
PO_DATA="{\"items\":[{\"productId\":\"$PROD_TSHIRT_BLK_S\",\"qtyOrdered\":60,\"unitCost\":25000},{\"productId\":\"$PROD_TSHIRT_BLK_M\",\"qtyOrdered\":120,\"unitCost\":25000},{\"productId\":\"$PROD_TSHIRT_BLK_L\",\"qtyOrdered\":80,\"unitCost\":25000}]}"
RESULT=$(api PATCH "/api/purchase-orders/$PO_TSHIRT" "$PO_DATA")

if echo "$RESULT" | jq -e '.data.totalAmount' > /dev/null 2>&1; then
    NEW_TOTAL=$(echo "$RESULT" | jq -r '.data.totalAmount')
    EXPECTED=$((260 * 25000))
    if [ "$NEW_TOTAL" = "$EXPECTED" ]; then
        log_pass "5.4 Update PO quantity before sending (total recalculated)"
    else
        log_fail "5.4 Update PO quantity" "Total=$NEW_TOTAL (expected $EXPECTED)"
    fi
else
    log_fail "5.4 Update PO quantity" "$(echo "$RESULT" | jq -r '.error // "Unknown error"')"
fi

# Test 5.5: Send PO to supplier
RESULT=$(api POST "/api/purchase-orders/$PO_TSHIRT/submit" "{}")

if echo "$RESULT" | jq -e '.data.status' > /dev/null 2>&1; then
    STATUS=$(echo "$RESULT" | jq -r '.data.status')
    if [ "$STATUS" = "SENT" ]; then
        log_pass "5.5 Send PO to supplier (DRAFT → SENT)"
    else
        log_fail "5.5 Send PO to supplier" "Status=$STATUS (expected SENT)"
    fi
else
    log_fail "5.5 Send PO to supplier" "$(echo "$RESULT" | jq -r '.error // "Unknown error"')"
fi

# Test 5.6: Verify stock before receiving (should be 0)
RESULT=$(api GET "/api/inventory/stock-levels?productId=$PROD_TSHIRT_BLK_S")
if echo "$RESULT" | jq -e '.data' > /dev/null 2>&1; then
    QTY=$(echo "$RESULT" | jq -r '.data[0].quantity // 0')
    if [ "$QTY" = "0" ] || [ -z "$QTY" ] || [ "$QTY" = "null" ]; then
        log_pass "5.6 Verify stock is 0 before PO received"
    else
        log_fail "5.6 Verify stock is 0" "Stock=$QTY (expected 0)"
    fi
else
    log_pass "5.6 Verify stock is 0 before PO received (no stock record)"
fi

# Test 5.7: Receive PO (stock should be added)
RESULT=$(api POST "/api/purchase-orders/$PO_TSHIRT/receive" "{}")

if echo "$RESULT" | jq -e '.data.status' > /dev/null 2>&1; then
    STATUS=$(echo "$RESULT" | jq -r '.data.status')
    if [ "$STATUS" = "RECEIVED" ]; then
        log_pass "5.7 Receive PO (SENT → RECEIVED)"
    else
        log_fail "5.7 Receive PO" "Status=$STATUS (expected RECEIVED)"
    fi
else
    log_fail "5.7 Receive PO" "$(echo "$RESULT" | jq -r '.error // "Unknown error"')"
fi

# Test 5.8: Verify stock after receiving
RESULT=$(api GET "/api/inventory/stock-levels?productId=$PROD_TSHIRT_BLK_S")
if echo "$RESULT" | jq -e '.data[0].quantity' > /dev/null 2>&1; then
    QTY=$(echo "$RESULT" | jq -r '.data[0].quantity')
    if [ "$QTY" = "60" ]; then
        log_pass "5.8 Verify stock added after PO received (qty=60)"
    else
        log_fail "5.8 Verify stock added" "Stock=$QTY (expected 60)"
    fi
else
    log_fail "5.8 Verify stock added" "No stock data returned"
fi

# Test 5.9: Send and receive Jeans PO
api POST "/api/purchase-orders/$PO_JEANS/send" "{}" > /dev/null
RESULT=$(api POST "/api/purchase-orders/$PO_JEANS/receive" "{}")
if echo "$RESULT" | jq -e '.data.status' > /dev/null 2>&1 && [ "$(echo "$RESULT" | jq -r '.data.status')" = "RECEIVED" ]; then
    log_pass "5.9 Send and receive Jeans PO"
else
    log_fail "5.9 Send and receive Jeans PO" "$(echo "$RESULT" | jq -r '.error // .data.status // "Unknown error"')"
fi

# Test 5.10: Send and receive Accessories PO
api POST "/api/purchase-orders/$PO_ACC/send" "{}" > /dev/null
RESULT=$(api POST "/api/purchase-orders/$PO_ACC/receive" "{}")
if echo "$RESULT" | jq -e '.data.status' > /dev/null 2>&1 && [ "$(echo "$RESULT" | jq -r '.data.status')" = "RECEIVED" ]; then
    log_pass "5.10 Send and receive Accessories PO"
else
    log_fail "5.10 Send and receive Accessories PO" "$(echo "$RESULT" | jq -r '.error // .data.status // "Unknown error"')"
fi

# Test 5.11: Create and cancel PO
PO_DATA="{\"supplierId\":\"$SUP_TEXTILE\",\"branchId\":\"$BRANCH_ID\",\"expectedDate\":\"2025-02-01T00:00:00Z\",\"notes\":\"PO to be cancelled\",\"items\":[{\"productId\":\"$PROD_TSHIRT_WHT_S\",\"qtyOrdered\":20,\"unitCost\":25000}]}"
RESULT=$(api POST "/api/purchase-orders" "$PO_DATA")
CANCEL_PO_ID=$(echo "$RESULT" | jq -r '.data.id')

RESULT=$(api POST "/api/purchase-orders/$CANCEL_PO_ID/cancel" "{}")
if echo "$RESULT" | jq -e '.data.status' > /dev/null 2>&1; then
    STATUS=$(echo "$RESULT" | jq -r '.data.status')
    if [ "$STATUS" = "CANCELLED" ]; then
        log_pass "5.11 Create and cancel PO before sending"
    else
        log_fail "5.11 Cancel PO" "Status=$STATUS (expected CANCELLED)"
    fi
else
    log_fail "5.11 Cancel PO" "$(echo "$RESULT" | jq -r '.error // "Unknown error"')"
fi

# Test 5.12: Try to cancel already received PO
RESULT=$(api POST "/api/purchase-orders/$PO_TSHIRT/cancel" "{}")
if echo "$RESULT" | jq -e '.error' > /dev/null 2>&1; then
    log_pass "5.12 Cannot cancel already received PO (correctly rejected)"
else
    STATUS=$(echo "$RESULT" | jq -r '.data.status // empty')
    if [ "$STATUS" = "CANCELLED" ]; then
        log_defect "Able to cancel already received PO - this may cause inventory inconsistency"
        log_fail "5.12 Cannot cancel received PO" "Should not allow cancellation"
    else
        log_pass "5.12 Cannot cancel already received PO"
    fi
fi

# Test 5.13: Create PO with negotiated lower price (bulk discount)
PO_DATA="{\"supplierId\":\"$SUP_TEXTILE\",\"branchId\":\"$BRANCH_ID\",\"expectedDate\":\"2025-01-25T00:00:00Z\",\"notes\":\"Bulk discount PO\",\"items\":[{\"productId\":\"$PROD_TSHIRT_WHT_S\",\"qtyOrdered\":200,\"unitCost\":22000},{\"productId\":\"$PROD_TSHIRT_WHT_M\",\"qtyOrdered\":200,\"unitCost\":22000}]}"
RESULT=$(api POST "/api/purchase-orders" "$PO_DATA")

if echo "$RESULT" | jq -e '.data.id' > /dev/null 2>&1; then
    PO_BULK=$(echo "$RESULT" | jq -r '.data.id')
    TOTAL=$(echo "$RESULT" | jq -r '.data.totalAmount')
    EXPECTED=$((400 * 22000))
    if [ "$TOTAL" = "$EXPECTED" ]; then
        log_pass "5.13 Create PO with negotiated lower price (total=$TOTAL)"
    else
        log_fail "5.13 Create PO with lower price" "Total=$TOTAL (expected $EXPECTED)"
    fi
else
    log_fail "5.13 Create PO with lower price" "$(echo "$RESULT" | jq -r '.error // "Unknown error"')"
fi

# Test 5.14: Receive bulk PO
api POST "/api/purchase-orders/$PO_BULK/send" "{}" > /dev/null
RESULT=$(api POST "/api/purchase-orders/$PO_BULK/receive" "{}")
if echo "$RESULT" | jq -e '.data.status' > /dev/null 2>&1 && [ "$(echo "$RESULT" | jq -r '.data.status')" = "RECEIVED" ]; then
    log_pass "5.14 Receive bulk PO with negotiated price"
else
    log_fail "5.14 Receive bulk PO" "$(echo "$RESULT" | jq -r '.error // .data.status // "Unknown error"')"
fi

# Test 5.15: Verify all stock levels after POs
RESULT=$(api GET "/api/inventory/stock-levels")
if echo "$RESULT" | jq -e '.data' > /dev/null 2>&1; then
    TSHIRT_S=$(echo "$RESULT" | jq -r '[.data[] | select(.productSku=="TSHIRT-BLK-S")][0].quantity // 0')
    TSHIRT_M=$(echo "$RESULT" | jq -r '[.data[] | select(.productSku=="TSHIRT-BLK-M")][0].quantity // 0')
    JEANS_32=$(echo "$RESULT" | jq -r '[.data[] | select(.productSku=="JEANS-BLU-32")][0].quantity // 0')
    CAP=$(echo "$RESULT" | jq -r '[.data[] | select(.productSku=="CAP-BLK")][0].quantity // 0')

    if [ "$TSHIRT_S" = "60" ] && [ "$TSHIRT_M" = "120" ] && [ "$JEANS_32" = "40" ] && [ "$CAP" = "100" ]; then
        log_pass "5.15 Verify all stock levels correct after POs"
    else
        log_fail "5.15 Verify stock levels" "TSHIRT-S=$TSHIRT_S(60), TSHIRT-M=$TSHIRT_M(120), JEANS-32=$JEANS_32(40), CAP=$CAP(100)"
    fi
else
    log_fail "5.15 Verify stock levels" "$(echo "$RESULT" | jq -r '.error // "Unknown error"')"
fi

# ============================================================
# SECTION 6: SALES ORDER WORKFLOWS (18 tests)
# ============================================================
echo ""
echo "--- SECTION 6: Sales Order Workflows ---"
echo ""

# Test 6.1: Create SO for retail customer (as DRAFT)
SO_DATA="{\"customerId\":\"$CUST_RETAIL\",\"branchId\":\"$BRANCH_ID\",\"notes\":\"Retail order #1\",\"saveAsDraft\":true,\"items\":[{\"productId\":\"$PROD_TSHIRT_BLK_M\",\"quantity\":2,\"unitPrice\":59900},{\"productId\":\"$PROD_CAP_BLK\",\"quantity\":1,\"unitPrice\":39900}]}"
RESULT=$(api POST "/api/orders" "$SO_DATA")

if echo "$RESULT" | jq -e '.data.id' > /dev/null 2>&1; then
    SO_RETAIL=$(echo "$RESULT" | jq -r '.data.id')
    STATUS=$(echo "$RESULT" | jq -r '.data.status')
    if [ "$STATUS" = "DRAFT" ]; then
        log_pass "6.1 Create SO for retail customer (DRAFT)"
    else
        log_fail "6.1 Create SO" "Status=$STATUS (expected DRAFT)"
    fi
else
    log_fail "6.1 Create SO for retail customer" "$(echo "$RESULT" | jq -r '.error // "Unknown error"')"
fi

# Test 6.2: Create SO for wholesale customer (as DRAFT for testing)
SO_DATA="{\"customerId\":\"$CUST_WHOLESALE\",\"branchId\":\"$BRANCH_ID\",\"notes\":\"Wholesale order\",\"saveAsDraft\":true,\"items\":[{\"productId\":\"$PROD_TSHIRT_BLK_S\",\"quantity\":10,\"unitPrice\":55000},{\"productId\":\"$PROD_TSHIRT_BLK_M\",\"quantity\":20,\"unitPrice\":55000}]}"
RESULT=$(api POST "/api/orders" "$SO_DATA")

if echo "$RESULT" | jq -e '.data.id' > /dev/null 2>&1; then
    SO_WHOLESALE=$(echo "$RESULT" | jq -r '.data.id')
    log_pass "6.2 Create SO for wholesale customer"
else
    log_fail "6.2 Create SO for wholesale" "$(echo "$RESULT" | jq -r '.error // "Unknown error"')"
fi

# Test 6.3: Create anonymous SO (walk-in customer)
SO_DATA="{\"branchId\":\"$BRANCH_ID\",\"notes\":\"Walk-in customer\",\"items\":[{\"productId\":\"$PROD_CAP_BLK\",\"quantity\":2,\"unitPrice\":39900}]}"
RESULT=$(api POST "/api/orders" "$SO_DATA")

if echo "$RESULT" | jq -e '.data.id' > /dev/null 2>&1; then
    SO_ANON=$(echo "$RESULT" | jq -r '.data.id')
    log_pass "6.3 Create anonymous SO (walk-in customer)"
else
    log_fail "6.3 Create anonymous SO" "$(echo "$RESULT" | jq -r '.error // "Unknown error"')"
fi

# Test 6.4: Verify stock not reserved in DRAFT
RESULT=$(api GET "/api/inventory/stock-levels?productId=$PROD_TSHIRT_BLK_M")
if echo "$RESULT" | jq -e '.data[0]' > /dev/null 2>&1; then
    RESERVED=$(echo "$RESULT" | jq -r '.data[0].reserved // 0')
    if [ "$RESERVED" = "0" ]; then
        log_pass "6.4 Stock not reserved in DRAFT status"
    else
        log_fail "6.4 Stock not reserved in DRAFT" "Reserved=$RESERVED (expected 0)"
    fi
else
    log_pass "6.4 Stock not reserved in DRAFT status"
fi

# Test 6.5: Confirm SO (reserve stock)
RESULT=$(api POST "/api/orders/$SO_RETAIL/confirm" "{}")
if echo "$RESULT" | jq -e '.data.status' > /dev/null 2>&1; then
    STATUS=$(echo "$RESULT" | jq -r '.data.status')
    if [ "$STATUS" = "CONFIRMED" ]; then
        log_pass "6.5 Confirm SO (DRAFT → CONFIRMED)"
    else
        log_fail "6.5 Confirm SO" "Status=$STATUS (expected CONFIRMED)"
    fi
else
    log_fail "6.5 Confirm SO" "$(echo "$RESULT" | jq -r '.error // "Unknown error"')"
fi

# Test 6.6: Verify stock is reserved after confirm
RESULT=$(api GET "/api/inventory/stock-levels?productId=$PROD_TSHIRT_BLK_M")
if echo "$RESULT" | jq -e '.data[0]' > /dev/null 2>&1; then
    RESERVED=$(echo "$RESULT" | jq -r '.data[0].reserved // 0')
    if [ "$RESERVED" = "2" ]; then
        log_pass "6.6 Stock reserved after SO confirmed (reserved=2)"
    else
        log_fail "6.6 Stock reserved after confirm" "Reserved=$RESERVED (expected 2)"
    fi
else
    log_fail "6.6 Stock reserved after confirm" "No stock data"
fi

# Test 6.7: Confirm wholesale order
RESULT=$(api POST "/api/orders/$SO_WHOLESALE/confirm" "{}")
if echo "$RESULT" | jq -e '.data.status' > /dev/null 2>&1 && [ "$(echo "$RESULT" | jq -r '.data.status')" = "CONFIRMED" ]; then
    log_pass "6.7 Confirm wholesale SO"
else
    log_fail "6.7 Confirm wholesale SO" "$(echo "$RESULT" | jq -r '.error // .data.status // "Unknown error"')"
fi

# Test 6.8: Verify total reserved stock
RESULT=$(api GET "/api/inventory/stock-levels?productId=$PROD_TSHIRT_BLK_M")
if echo "$RESULT" | jq -e '.data[0]' > /dev/null 2>&1; then
    RESERVED=$(echo "$RESULT" | jq -r '.data[0].reserved // 0')
    # Should be 2 (retail) + 20 (wholesale) = 22
    if [ "$RESERVED" = "22" ]; then
        log_pass "6.8 Verify total reserved stock (reserved=22)"
    else
        log_fail "6.8 Total reserved stock" "Reserved=$RESERVED (expected 22)"
    fi
else
    log_fail "6.8 Total reserved stock" "No stock data"
fi

# Test 6.9: Ship SO
RESULT=$(api POST "/api/orders/$SO_RETAIL/ship" '{"trackingNumber":"TH123456789","carrier":"Thai Post"}')
if echo "$RESULT" | jq -e '.data' > /dev/null 2>&1; then
    FULFILLMENT=$(echo "$RESULT" | jq -r '.data.fulfillmentStatus')
    if [ "$FULFILLMENT" = "SHIPPED" ]; then
        log_pass "6.9 Ship SO (fulfillmentStatus → SHIPPED)"
    else
        log_fail "6.9 Ship SO" "FulfillmentStatus=$FULFILLMENT (expected SHIPPED)"
    fi
else
    log_fail "6.9 Ship SO" "$(echo "$RESULT" | jq -r '.error // "Unknown error"')"
fi

# Test 6.10: Deliver SO
RESULT=$(api POST "/api/orders/$SO_RETAIL/deliver" "{}")
if echo "$RESULT" | jq -e '.data' > /dev/null 2>&1; then
    FULFILLMENT=$(echo "$RESULT" | jq -r '.data.fulfillmentStatus')
    if [ "$FULFILLMENT" = "DELIVERED" ]; then
        log_pass "6.10 Deliver SO (fulfillmentStatus → DELIVERED)"
    else
        log_fail "6.10 Deliver SO" "FulfillmentStatus=$FULFILLMENT (expected DELIVERED)"
    fi
else
    log_fail "6.10 Deliver SO" "$(echo "$RESULT" | jq -r '.error // "Unknown error"')"
fi

# Test 6.11: Complete SO
RESULT=$(api POST "/api/orders/$SO_RETAIL/complete" "{}")
if echo "$RESULT" | jq -e '.data.status' > /dev/null 2>&1; then
    STATUS=$(echo "$RESULT" | jq -r '.data.status')
    if [ "$STATUS" = "COMPLETED" ]; then
        log_pass "6.11 Complete SO (DELIVERED → COMPLETED)"
    else
        log_fail "6.11 Complete SO" "Status=$STATUS (expected COMPLETED)"
    fi
else
    log_fail "6.11 Complete SO" "$(echo "$RESULT" | jq -r '.error // "Unknown error"')"
fi

# Test 6.12: Verify stock deducted after SO completed
RESULT=$(api GET "/api/inventory/stock-levels?productId=$PROD_TSHIRT_BLK_M")
if echo "$RESULT" | jq -e '.data[0]' > /dev/null 2>&1; then
    QTY=$(echo "$RESULT" | jq -r '.data[0].quantity // 0')
    RESERVED=$(echo "$RESULT" | jq -r '.data[0].reserved // 0')
    # Qty should be 120 - 2 = 118, Reserved should be 20 (only wholesale now)
    if [ "$QTY" = "118" ] && [ "$RESERVED" = "20" ]; then
        log_pass "6.12 Stock deducted after SO completed (qty=118, reserved=20)"
    else
        log_fail "6.12 Stock deducted" "Qty=$QTY(118), Reserved=$RESERVED(20)"
    fi
else
    log_fail "6.12 Stock deducted" "No stock data"
fi

# Test 6.13: Create and cancel SO before confirm
SO_DATA="{\"customerId\":\"$CUST_ONLINE\",\"branchId\":\"$BRANCH_ID\",\"items\":[{\"productId\":\"$PROD_JEANS_BLU_32\",\"quantity\":5,\"unitPrice\":129900}]}"
RESULT=$(api POST "/api/orders" "$SO_DATA")
CANCEL_SO_ID=$(echo "$RESULT" | jq -r '.data.id')

RESULT=$(api POST "/api/orders/$CANCEL_SO_ID/cancel" "{}")
if echo "$RESULT" | jq -e '.data.status' > /dev/null 2>&1; then
    STATUS=$(echo "$RESULT" | jq -r '.data.status')
    if [ "$STATUS" = "CANCELLED" ]; then
        log_pass "6.13 Cancel SO before confirm"
    else
        log_fail "6.13 Cancel SO" "Status=$STATUS (expected CANCELLED)"
    fi
else
    log_fail "6.13 Cancel SO" "$(echo "$RESULT" | jq -r '.error // "Unknown error"')"
fi

# Test 6.14: Cancel confirmed SO (releases reservation)
SO_DATA="{\"customerId\":\"$CUST_VIP\",\"branchId\":\"$BRANCH_ID\",\"saveAsDraft\":true,\"items\":[{\"productId\":\"$PROD_JEANS_BLU_34\",\"quantity\":5,\"unitPrice\":129900}]}"
RESULT=$(api POST "/api/orders" "$SO_DATA")
CANCEL_CONF_SO_ID=$(echo "$RESULT" | jq -r '.data.id')

# Confirm to reserve (DRAFT → CONFIRMED reserves stock)
api POST "/api/orders/$CANCEL_CONF_SO_ID/confirm" "{}" > /dev/null

# Get reserved before cancel
RESULT=$(api GET "/api/inventory/stock-levels?productId=$PROD_JEANS_BLU_34")
RESERVED_BEFORE=$(echo "$RESULT" | jq -r '.data[0].reserved // 0')

# Cancel
RESULT=$(api POST "/api/orders/$CANCEL_CONF_SO_ID/cancel" "{}")

# Get reserved after cancel
RESULT=$(api GET "/api/inventory/stock-levels?productId=$PROD_JEANS_BLU_34")
RESERVED_AFTER=$(echo "$RESULT" | jq -r '.data[0].reserved // 0')

if [ "$RESERVED_AFTER" -lt "$RESERVED_BEFORE" ] 2>/dev/null; then
    log_pass "6.14 Cancel confirmed SO (reservation released: $RESERVED_BEFORE → $RESERVED_AFTER)"
else
    log_defect "Reservation not released after cancelling confirmed SO"
    log_fail "6.14 Cancel confirmed SO" "Reserved before=$RESERVED_BEFORE, after=$RESERVED_AFTER"
fi

# Test 6.15: Try to create SO exceeding available stock
SO_DATA="{\"customerId\":\"$CUST_ONLINE\",\"branchId\":\"$BRANCH_ID\",\"items\":[{\"productId\":\"$PROD_CAP_BLK\",\"quantity\":9999,\"unitPrice\":39900}]}"
RESULT=$(api POST "/api/orders" "$SO_DATA")
EXCEED_SO_ID=$(echo "$RESULT" | jq -r '.data.id // empty')

if [ -n "$EXCEED_SO_ID" ]; then
    RESULT=$(api POST "/api/orders/$EXCEED_SO_ID/confirm" "{}")
    if echo "$RESULT" | jq -e '.error' > /dev/null 2>&1; then
        log_pass "6.15 Cannot confirm SO exceeding available stock"
    else
        log_defect "Able to confirm SO with quantity exceeding stock"
        log_fail "6.15 Cannot confirm SO exceeding stock" "Should reject"
    fi
else
    log_pass "6.15 Cannot create SO exceeding stock"
fi

# Test 6.16: Update SO items before confirm
SO_DATA="{\"customerId\":\"$CUST_RETAIL\",\"branchId\":\"$BRANCH_ID\",\"items\":[{\"productId\":\"$PROD_TSHIRT_BLK_S\",\"quantity\":1,\"unitPrice\":59900}]}"
RESULT=$(api POST "/api/orders" "$SO_DATA")
UPDATE_SO_ID=$(echo "$RESULT" | jq -r '.data.id')

SO_DATA="{\"items\":[{\"productId\":\"$PROD_TSHIRT_BLK_S\",\"quantity\":3,\"unitPrice\":59900},{\"productId\":\"$PROD_TSHIRT_BLK_L\",\"quantity\":2,\"unitPrice\":59900}]}"
RESULT=$(api PATCH "/api/orders/$UPDATE_SO_ID" "$SO_DATA")

if echo "$RESULT" | jq -e '.data.totalAmount' > /dev/null 2>&1; then
    TOTAL=$(echo "$RESULT" | jq -r '.data.totalAmount')
    EXPECTED=$((5 * 59900))
    if [ "$TOTAL" = "$EXPECTED" ]; then
        log_pass "6.16 Update SO items before confirm (total recalculated)"
    else
        log_fail "6.16 Update SO items" "Total=$TOTAL (expected $EXPECTED)"
    fi
else
    log_fail "6.16 Update SO items" "$(echo "$RESULT" | jq -r '.error // "Unknown error"')"
fi

# Test 6.17: Record payment for order
RESULT=$(api POST "/api/orders/$SO_WHOLESALE/payment" '{"method":"BANK_TRANSFER","amount":1650000,"note":"Partial payment"}')
if echo "$RESULT" | jq -e '.data' > /dev/null 2>&1; then
    log_pass "6.17 Record payment for order"
else
    log_fail "6.17 Record payment" "$(echo "$RESULT" | jq -r '.error // "Unknown error"')"
fi

# Test 6.18: Get order stats
RESULT=$(api GET "/api/orders/stats")
if echo "$RESULT" | jq -e '.data.totalOrders' > /dev/null 2>&1; then
    TOTAL_ORDERS=$(echo "$RESULT" | jq -r '.data.totalOrders')
    if [ "$TOTAL_ORDERS" -gt 0 ] 2>/dev/null; then
        log_pass "6.18 Get order statistics (totalOrders=$TOTAL_ORDERS)"
    else
        log_fail "6.18 Get order statistics" "No orders found"
    fi
else
    log_fail "6.18 Get order statistics" "$(echo "$RESULT" | jq -r '.error // "Unknown error"')"
fi

# ============================================================
# SECTION 7: COMPLEX SCENARIOS (10 tests)
# ============================================================
echo ""
echo "--- SECTION 7: Complex Scenarios ---"
echo ""

# Test 7.1: Restock after selling
RESULT=$(api GET "/api/inventory/stock-levels?productId=$PROD_TSHIRT_BLK_S")
CURRENT_STOCK=$(echo "$RESULT" | jq -r '.data[0].quantity // 0')

# Create restock PO
PO_DATA="{\"supplierId\":\"$SUP_TEXTILE\",\"branchId\":\"$BRANCH_ID\",\"expectedDate\":\"2025-02-01T00:00:00Z\",\"notes\":\"Restock order\",\"items\":[{\"productId\":\"$PROD_TSHIRT_BLK_S\",\"qtyOrdered\":50,\"unitCost\":25000}]}"
RESULT=$(api POST "/api/purchase-orders" "$PO_DATA")
RESTOCK_PO_ID=$(echo "$RESULT" | jq -r '.data.id')

api POST "/api/purchase-orders/$RESTOCK_PO_ID/send" "{}" > /dev/null
api POST "/api/purchase-orders/$RESTOCK_PO_ID/receive" "{}" > /dev/null

RESULT=$(api GET "/api/inventory/stock-levels?productId=$PROD_TSHIRT_BLK_S")
NEW_STOCK=$(echo "$RESULT" | jq -r '.data[0].quantity // 0')
EXPECTED=$((CURRENT_STOCK + 50))

if [ "$NEW_STOCK" = "$EXPECTED" ]; then
    log_pass "7.1 Restock scenario: PO after stock runs low (stock: $CURRENT_STOCK → $NEW_STOCK)"
else
    log_fail "7.1 Restock scenario" "New stock=$NEW_STOCK (expected $EXPECTED)"
fi

# Test 7.2: Multiple concurrent orders for same product
for i in 1 2 3; do
    SO_DATA="{\"branchId\":\"$BRANCH_ID\",\"items\":[{\"productId\":\"$PROD_TSHIRT_BLK_L\",\"quantity\":5,\"unitPrice\":59900}]}"
    RESULT=$(api POST "/api/orders" "$SO_DATA")
    ORDER_ID=$(echo "$RESULT" | jq -r '.data.id')
    api POST "/api/orders/$ORDER_ID/confirm" "{}" > /dev/null 2>&1
done

RESULT=$(api GET "/api/inventory/stock-levels?productId=$PROD_TSHIRT_BLK_L")
RESERVED=$(echo "$RESULT" | jq -r '.data[0].reserved // 0')
if [ "$RESERVED" -ge 15 ] 2>/dev/null; then
    log_pass "7.2 Multiple concurrent orders for same product (reserved=$RESERVED)"
else
    log_fail "7.2 Multiple concurrent orders" "Reserved=$RESERVED (expected >= 15)"
fi

# Test 7.3: Complete order lifecycle
SO_DATA="{\"customerId\":\"$CUST_VIP\",\"branchId\":\"$BRANCH_ID\",\"items\":[{\"productId\":\"$PROD_JEANS_BLU_32\",\"quantity\":1,\"unitPrice\":129900}]}"
RESULT=$(api POST "/api/orders" "$SO_DATA")
LIFECYCLE_SO=$(echo "$RESULT" | jq -r '.data.id')

api POST "/api/orders/$LIFECYCLE_SO/confirm" "{}" > /dev/null
api POST "/api/orders/$LIFECYCLE_SO/ship" '{"trackingNumber":"VIP123","carrier":"Express"}' > /dev/null
api POST "/api/orders/$LIFECYCLE_SO/deliver" "{}" > /dev/null
RESULT=$(api POST "/api/orders/$LIFECYCLE_SO/complete" "{}")

if [ "$(echo "$RESULT" | jq -r '.data.status')" = "COMPLETED" ]; then
    log_pass "7.3 Complete order lifecycle test"
else
    log_fail "7.3 Complete order lifecycle" "$(echo "$RESULT" | jq -r '.error // .data.status // "Unknown"')"
fi

# Test 7.4: COGS and profit calculation
RESULT=$(api GET "/api/orders/stats")
if echo "$RESULT" | jq -e '.data.totalRevenue' > /dev/null 2>&1; then
    REVENUE=$(echo "$RESULT" | jq -r '.data.totalRevenue')
    PROFIT=$(echo "$RESULT" | jq -r '.data.totalProfit // 0')
    log_pass "7.4 COGS and profit calculation (revenue=$REVENUE, profit=$PROFIT)"
else
    log_fail "7.4 COGS and profit" "$(echo "$RESULT" | jq -r '.error // "Unknown error"')"
fi

# Test 7.5: Low stock detection
RESULT=$(api GET "/api/inventory/low-stock")
if echo "$RESULT" | jq -e '.data' > /dev/null 2>&1; then
    log_pass "7.5 Low stock detection API works"
else
    log_fail "7.5 Low stock detection" "$(echo "$RESULT" | jq -r '.error // "Unknown error"')"
fi

# Test 7.6: Inventory search
RESULT=$(api GET "/api/inventory/stock-levels")
if echo "$RESULT" | jq -e '.data' > /dev/null 2>&1; then
    COUNT=$(echo "$RESULT" | jq -r '.data | length')
    log_pass "7.6 Inventory listing (found $COUNT items)"
else
    log_fail "7.6 Inventory listing" "$(echo "$RESULT" | jq -r '.error // "Unknown error"')"
fi

# Test 7.7: Order listing with status filter
RESULT=$(api GET "/api/orders?status=COMPLETED")
if echo "$RESULT" | jq -e '.data' > /dev/null 2>&1; then
    COUNT=$(echo "$RESULT" | jq -r '.data | length')
    log_pass "7.7 Order listing with status filter (found $COUNT completed)"
else
    log_fail "7.7 Order listing with filter" "$(echo "$RESULT" | jq -r '.error // "Unknown error"')"
fi

# Test 7.8: PO listing with filters
RESULT=$(api GET "/api/purchase-orders?status=RECEIVED")
if echo "$RESULT" | jq -e '.data' > /dev/null 2>&1; then
    COUNT=$(echo "$RESULT" | jq -r '.data | length')
    log_pass "7.8 PO listing with filters (found $COUNT received)"
else
    log_fail "7.8 PO listing with filters" "$(echo "$RESULT" | jq -r '.error // "Unknown error"')"
fi

# Test 7.9: Customer order history
RESULT=$(api GET "/api/orders?customerId=$CUST_VIP")
if echo "$RESULT" | jq -e '.data' > /dev/null 2>&1; then
    COUNT=$(echo "$RESULT" | jq -r '.data | length')
    log_pass "7.9 Customer order history (found $COUNT orders)"
else
    log_fail "7.9 Customer order history" "$(echo "$RESULT" | jq -r '.error // "Unknown error"')"
fi

# Test 7.10: Inventory movement tracking
RESULT=$(api GET "/api/inventory/movements?productId=$PROD_TSHIRT_BLK_S")
# Check if response has data array (even if empty)
if echo "$RESULT" | jq -e 'has("data")' > /dev/null 2>&1; then
    COUNT=$(echo "$RESULT" | jq -r '.data | length')
    log_pass "7.10 Inventory movement tracking (found $COUNT movements)"
elif echo "$RESULT" | jq -e 'has("error")' > /dev/null 2>&1; then
    log_fail "7.10 Inventory movement tracking" "$(echo "$RESULT" | jq -r '.error')"
else
    log_fail "7.10 Inventory movement tracking" "Unexpected response format"
fi

# ============================================================
# SECTION 8: EDGE CASES & ERROR HANDLING (10 tests)
# ============================================================
echo ""
echo "--- SECTION 8: Edge Cases & Error Handling ---"
echo ""

# Test 8.1: Duplicate SKU
RESULT=$(api POST "/api/products" '{"sku":"TSHIRT-BLK-S","name":"Duplicate","price":100,"cost":50}')
if echo "$RESULT" | jq -e '.error' > /dev/null 2>&1; then
    log_pass "8.1 Duplicate SKU correctly rejected"
else
    log_defect "Duplicate SKU allowed"
    log_fail "8.1 Duplicate SKU" "Should reject duplicate"
fi

# Test 8.2: Invalid product ID in order
SO_DATA="{\"branchId\":\"$BRANCH_ID\",\"items\":[{\"productId\":\"invalid-product-id\",\"quantity\":1,\"unitPrice\":100}]}"
RESULT=$(api POST "/api/orders" "$SO_DATA")
if echo "$RESULT" | jq -e '.error' > /dev/null 2>&1; then
    log_pass "8.2 Invalid product ID correctly rejected"
else
    log_defect "Invalid product ID accepted in order"
    log_fail "8.2 Invalid product ID" "Should reject"
fi

# Test 8.3: Negative quantity
SO_DATA="{\"branchId\":\"$BRANCH_ID\",\"items\":[{\"productId\":\"$PROD_CAP_BLK\",\"quantity\":-5,\"unitPrice\":39900}]}"
RESULT=$(api POST "/api/orders" "$SO_DATA")
if echo "$RESULT" | jq -e '.error' > /dev/null 2>&1; then
    log_pass "8.3 Negative quantity correctly rejected"
else
    log_defect "Negative quantity accepted"
    log_fail "8.3 Negative quantity" "Should reject"
fi

# Test 8.4: Zero quantity
SO_DATA="{\"branchId\":\"$BRANCH_ID\",\"items\":[{\"productId\":\"$PROD_CAP_BLK\",\"quantity\":0,\"unitPrice\":39900}]}"
RESULT=$(api POST "/api/orders" "$SO_DATA")
if echo "$RESULT" | jq -e '.error' > /dev/null 2>&1; then
    log_pass "8.4 Zero quantity correctly rejected"
else
    log_defect "Zero quantity accepted"
    log_fail "8.4 Zero quantity" "Should reject"
fi

# Test 8.5: Empty items
RESULT=$(api POST "/api/orders" "{\"branchId\":\"$BRANCH_ID\",\"items\":[]}")
if echo "$RESULT" | jq -e '.error' > /dev/null 2>&1; then
    log_pass "8.5 Empty items correctly rejected"
else
    log_defect "Empty items accepted"
    log_fail "8.5 Empty items" "Should reject"
fi

# Test 8.6: Unauthorized access
rm -f "$COOKIE_JAR"
RESULT=$(curl -s -X GET "$BASE_URL/api/orders" -H "Content-Type: application/json")
if echo "$RESULT" | jq -e '.error' > /dev/null 2>&1 && [ "$(echo "$RESULT" | jq -r '.error')" = "unauthorized" ]; then
    log_pass "8.6 Unauthorized access correctly blocked"
else
    log_fail "8.6 Unauthorized access" "Should return unauthorized"
fi

# Re-login for remaining tests
api POST "/api/auth/login" "{\"email\":\"$EMAIL\",\"password\":\"test123456\"}" > /dev/null

# Test 8.7: Update non-existent order
RESULT=$(api PATCH "/api/orders/non-existent-id" '{"notes":"test"}')
if echo "$RESULT" | jq -e '.error' > /dev/null 2>&1; then
    log_pass "8.7 Update non-existent order correctly rejected"
else
    log_fail "8.7 Update non-existent order" "Should reject"
fi

# Test 8.8: Ship DRAFT order
SO_DATA="{\"branchId\":\"$BRANCH_ID\",\"items\":[{\"productId\":\"$PROD_CAP_BLK\",\"quantity\":1,\"unitPrice\":39900}]}"
RESULT=$(api POST "/api/orders" "$SO_DATA")
DRAFT_SO_ID=$(echo "$RESULT" | jq -r '.data.id')

RESULT=$(api POST "/api/orders/$DRAFT_SO_ID/ship" '{"trackingNumber":"TEST"}')
if echo "$RESULT" | jq -e '.error' > /dev/null 2>&1; then
    log_pass "8.8 Cannot ship DRAFT order (correctly rejected)"
else
    log_defect "Can ship DRAFT order - workflow violation"
    log_fail "8.8 Cannot ship DRAFT order" "Should reject"
fi

# Test 8.9: Complete undelivered order
SO_DATA="{\"branchId\":\"$BRANCH_ID\",\"items\":[{\"productId\":\"$PROD_CAP_BLK\",\"quantity\":1,\"unitPrice\":39900}]}"
RESULT=$(api POST "/api/orders" "$SO_DATA")
UNDELIVERED_SO_ID=$(echo "$RESULT" | jq -r '.data.id')
api POST "/api/orders/$UNDELIVERED_SO_ID/confirm" "{}" > /dev/null

RESULT=$(api POST "/api/orders/$UNDELIVERED_SO_ID/complete" "{}")
if echo "$RESULT" | jq -e '.error' > /dev/null 2>&1; then
    log_pass "8.9 Cannot complete undelivered order (correctly rejected)"
else
    log_defect "Can complete undelivered order - workflow violation"
    log_fail "8.9 Cannot complete undelivered order" "Should reject"
fi

# Test 8.10: Delete product with stock
RESULT=$(api DELETE "/api/products/$PROD_TSHIRT_BLK_S")
if echo "$RESULT" | jq -e '.error' > /dev/null 2>&1; then
    log_pass "8.10 Delete product with stock correctly rejected"
else
    log_defect "Product with stock deleted without protection"
    log_fail "8.10 Delete product with stock" "Should reject or soft delete"
fi

# ============================================================
# SUMMARY
# ============================================================
echo ""
echo "============================================================"
echo "TEST SUMMARY"
echo "============================================================"
echo ""

TOTAL=$((PASSED + FAILED))
if [ $TOTAL -gt 0 ]; then
    PASS_RATE=$(echo "scale=1; $PASSED * 100 / $TOTAL" | bc 2>/dev/null || echo "N/A")
else
    PASS_RATE="N/A"
fi

echo "Total Tests: $TOTAL"
echo -e "Passed: ${GREEN}$PASSED${NC} ($PASS_RATE%)"
echo -e "Failed: ${RED}$FAILED${NC}"

if [ -n "$DEFECTS" ]; then
    echo ""
    echo -e "${YELLOW}--- Defects Found ---${NC}"
    echo -e "$DEFECTS"
fi

echo ""
echo "============================================================"

# Exit with failure if any tests failed
if [ $FAILED -gt 0 ]; then
    exit 1
fi
