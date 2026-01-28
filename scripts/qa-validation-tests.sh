#!/bin/bash

# =============================================================================
# QA VALIDATION TEST SCRIPT
# =============================================================================
# This script tests server-side validation by attempting to submit filings
# with missing required fields. The server should REJECT all invalid submissions.
# =============================================================================

# Configuration - Update these values
STRAPI_URL="${STRAPI_URL:-http://localhost:1337}"
AUTH_TOKEN="${AUTH_TOKEN:-}"  # Set via: export AUTH_TOKEN="your-jwt-token"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0
TOTAL=0

# Helper function to print test results
print_result() {
    local test_name="$1"
    local expected="$2"
    local actual="$3"
    local response="$4"

    TOTAL=$((TOTAL + 1))

    if [[ "$expected" == "$actual" ]]; then
        echo -e "${GREEN}✓ PASS${NC}: $test_name"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ FAIL${NC}: $test_name"
        echo -e "  Expected: $expected"
        echo -e "  Actual: $actual"
        echo -e "  Response: ${response:0:200}..."
        FAILED=$((FAILED + 1))
    fi
}

# Helper function to extract HTTP status code
get_status() {
    echo "$1" | tail -1
}

# Helper function to extract response body
get_body() {
    echo "$1" | sed '$d'
}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  SERVER-SIDE VALIDATION QA TESTS${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Strapi URL: $STRAPI_URL"
echo ""

# Check if AUTH_TOKEN is set
if [[ -z "$AUTH_TOKEN" ]]; then
    echo -e "${YELLOW}WARNING: AUTH_TOKEN not set. Some tests may fail.${NC}"
    echo "Set it with: export AUTH_TOKEN=\"your-jwt-token\""
    echo ""
fi

# =============================================================================
# PREREQUISITE: Get filing status IDs
# =============================================================================
echo -e "${BLUE}--- Getting Filing Status IDs ---${NC}"

UNDER_REVIEW_STATUS=$(curl -s -X GET "$STRAPI_URL/api/filing-statuses?filters[statusCode][\$eq]=UNDER_REVIEW" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" | jq -r '.data[0].documentId // .data[0].id // empty')

IN_PROGRESS_STATUS=$(curl -s -X GET "$STRAPI_URL/api/filing-statuses?filters[statusCode][\$eq]=IN_PROGRESS" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" | jq -r '.data[0].documentId // .data[0].id // empty')

echo "UNDER_REVIEW status ID: $UNDER_REVIEW_STATUS"
echo "IN_PROGRESS status ID: $IN_PROGRESS_STATUS"
echo ""

if [[ -z "$UNDER_REVIEW_STATUS" ]]; then
    echo -e "${RED}ERROR: Could not find UNDER_REVIEW status. Aborting tests.${NC}"
    exit 1
fi

# =============================================================================
# TEST CATEGORY 1: PERSONAL FILING VALIDATION
# =============================================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  CATEGORY 1: PERSONAL FILING TESTS${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Create a test personal filing first
echo "Creating test PERSONAL filing..."
CREATE_RESPONSE=$(curl -s -X POST "$STRAPI_URL/api/filings" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "data": {
            "filingType": "PERSONAL",
            "taxYear": 2025
        }
    }')

PERSONAL_FILING_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data.documentId // .data.id // empty')
echo "Created filing ID: $PERSONAL_FILING_ID"

if [[ -z "$PERSONAL_FILING_ID" || "$PERSONAL_FILING_ID" == "null" ]]; then
    echo -e "${YELLOW}Could not create test filing. Using existing filing for tests.${NC}"
    # Try to get an existing filing
    PERSONAL_FILING_ID=$(curl -s -X GET "$STRAPI_URL/api/filings?filters[filingType][type][\$eq]=PERSONAL&pagination[limit]=1" \
        -H "Authorization: Bearer $AUTH_TOKEN" | jq -r '.data[0].documentId // .data[0].id // empty')
    echo "Using existing filing: $PERSONAL_FILING_ID"
fi

echo ""

# -----------------------------------------------------------------------------
# TEST 1.1: Submit personal filing with COMPLETELY EMPTY form data
# -----------------------------------------------------------------------------
echo -e "${YELLOW}TEST 1.1: Submit personal filing with NO DATA${NC}"

RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$STRAPI_URL/api/filings/$PERSONAL_FILING_ID" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"data\": {
            \"filingStatus\": \"$UNDER_REVIEW_STATUS\"
        }
    }")

HTTP_STATUS=$(get_status "$RESPONSE")
BODY=$(get_body "$RESPONSE")

# Should be REJECTED (400 or similar error)
if [[ "$HTTP_STATUS" -ge 400 ]]; then
    print_result "Empty form data should be REJECTED" "REJECTED" "REJECTED" "$BODY"
else
    print_result "Empty form data should be REJECTED" "REJECTED" "ACCEPTED (status: $HTTP_STATUS)" "$BODY"
fi

# -----------------------------------------------------------------------------
# TEST 1.2: Submit with only first name (missing other required fields)
# -----------------------------------------------------------------------------
echo -e "${YELLOW}TEST 1.2: Submit with only firstName (missing lastName, SIN, etc.)${NC}"

# First update filing data
curl -s -X PUT "$STRAPI_URL/api/filings/$PERSONAL_FILING_ID" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "data": {
            "filingData": {
                "personalInfo": {
                    "firstName": "John"
                }
            }
        }
    }' > /dev/null

# Now try to submit
RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$STRAPI_URL/api/filings/$PERSONAL_FILING_ID" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"data\": {
            \"filingStatus\": \"$UNDER_REVIEW_STATUS\"
        }
    }")

HTTP_STATUS=$(get_status "$RESPONSE")
BODY=$(get_body "$RESPONSE")

if [[ "$HTTP_STATUS" -ge 400 ]]; then
    print_result "Missing lastName, SIN, DOB should be REJECTED" "REJECTED" "REJECTED" "$BODY"
else
    print_result "Missing lastName, SIN, DOB should be REJECTED" "REJECTED" "ACCEPTED (status: $HTTP_STATUS)" "$BODY"
fi

# -----------------------------------------------------------------------------
# TEST 1.3: Submit with name but missing SIN
# -----------------------------------------------------------------------------
echo -e "${YELLOW}TEST 1.3: Submit with name but missing SIN${NC}"

curl -s -X PUT "$STRAPI_URL/api/filings/$PERSONAL_FILING_ID" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "data": {
            "filingData": {
                "personalInfo": {
                    "firstName": "John",
                    "lastName": "Doe",
                    "dateOfBirth": "1990-01-01",
                    "phoneNumber": "416-555-1234"
                }
            }
        }
    }' > /dev/null

RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$STRAPI_URL/api/filings/$PERSONAL_FILING_ID" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"data\": {
            \"filingStatus\": \"$UNDER_REVIEW_STATUS\"
        }
    }")

HTTP_STATUS=$(get_status "$RESPONSE")
BODY=$(get_body "$RESPONSE")

if [[ "$HTTP_STATUS" -ge 400 ]]; then
    print_result "Missing SIN should be REJECTED" "REJECTED" "REJECTED" "$BODY"
else
    print_result "Missing SIN should be REJECTED" "REJECTED" "ACCEPTED (status: $HTTP_STATUS)" "$BODY"
fi

# -----------------------------------------------------------------------------
# TEST 1.4: Submit with name, SIN but missing address
# -----------------------------------------------------------------------------
echo -e "${YELLOW}TEST 1.4: Submit with name, SIN but missing address${NC}"

curl -s -X PUT "$STRAPI_URL/api/filings/$PERSONAL_FILING_ID" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "data": {
            "filingData": {
                "personalInfo": {
                    "firstName": "John",
                    "lastName": "Doe",
                    "sin": "123-456-789",
                    "dateOfBirth": "1990-01-01",
                    "phoneNumber": "416-555-1234"
                }
            }
        }
    }' > /dev/null

RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$STRAPI_URL/api/filings/$PERSONAL_FILING_ID" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"data\": {
            \"filingStatus\": \"$UNDER_REVIEW_STATUS\"
        }
    }")

HTTP_STATUS=$(get_status "$RESPONSE")
BODY=$(get_body "$RESPONSE")

if [[ "$HTTP_STATUS" -ge 400 ]]; then
    print_result "Missing address should be REJECTED" "REJECTED" "REJECTED" "$BODY"
else
    print_result "Missing address should be REJECTED" "REJECTED" "ACCEPTED (status: $HTTP_STATUS)" "$BODY"
fi

# -----------------------------------------------------------------------------
# TEST 1.5: Submit with partial address (missing city, province)
# -----------------------------------------------------------------------------
echo -e "${YELLOW}TEST 1.5: Submit with partial address (missing city, province)${NC}"

curl -s -X PUT "$STRAPI_URL/api/filings/$PERSONAL_FILING_ID" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "data": {
            "filingData": {
                "personalInfo": {
                    "firstName": "John",
                    "lastName": "Doe",
                    "sin": "123-456-789",
                    "dateOfBirth": "1990-01-01",
                    "phoneNumber": "416-555-1234",
                    "streetNumber": "123",
                    "streetName": "Main St"
                }
            }
        }
    }' > /dev/null

RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$STRAPI_URL/api/filings/$PERSONAL_FILING_ID" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"data\": {
            \"filingStatus\": \"$UNDER_REVIEW_STATUS\"
        }
    }")

HTTP_STATUS=$(get_status "$RESPONSE")
BODY=$(get_body "$RESPONSE")

if [[ "$HTTP_STATUS" -ge 400 ]]; then
    print_result "Missing city/province should be REJECTED" "REJECTED" "REJECTED" "$BODY"
else
    print_result "Missing city/province should be REJECTED" "REJECTED" "ACCEPTED (status: $HTTP_STATUS)" "$BODY"
fi

# -----------------------------------------------------------------------------
# TEST 1.6: Submit with missing marital status
# -----------------------------------------------------------------------------
echo -e "${YELLOW}TEST 1.6: Submit with all fields but missing marital status${NC}"

curl -s -X PUT "$STRAPI_URL/api/filings/$PERSONAL_FILING_ID" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "data": {
            "filingData": {
                "personalInfo": {
                    "firstName": "John",
                    "lastName": "Doe",
                    "sin": "123-456-789",
                    "dateOfBirth": "1990-01-01",
                    "phoneNumber": "416-555-1234",
                    "streetNumber": "123",
                    "streetName": "Main St",
                    "city": "Toronto",
                    "province": "ON",
                    "postalCode": "M5V1K2"
                }
            }
        }
    }' > /dev/null

RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$STRAPI_URL/api/filings/$PERSONAL_FILING_ID" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"data\": {
            \"filingStatus\": \"$UNDER_REVIEW_STATUS\"
        }
    }")

HTTP_STATUS=$(get_status "$RESPONSE")
BODY=$(get_body "$RESPONSE")

if [[ "$HTTP_STATUS" -ge 400 ]]; then
    print_result "Missing marital status should be REJECTED" "REJECTED" "REJECTED" "$BODY"
else
    print_result "Missing marital status should be REJECTED" "REJECTED" "ACCEPTED (status: $HTTP_STATUS)" "$BODY"
fi

# -----------------------------------------------------------------------------
# TEST 1.7: Submit with ALL required fields (should PASS)
# -----------------------------------------------------------------------------
echo -e "${YELLOW}TEST 1.7: Submit with ALL required fields (should PASS)${NC}"

curl -s -X PUT "$STRAPI_URL/api/filings/$PERSONAL_FILING_ID" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "data": {
            "filingData": {
                "personalInfo": {
                    "firstName": "John",
                    "lastName": "Doe",
                    "sin": "123-456-789",
                    "dateOfBirth": "1990-01-01",
                    "phoneNumber": "416-555-1234",
                    "streetNumber": "123",
                    "streetName": "Main St",
                    "city": "Toronto",
                    "province": "ON",
                    "postalCode": "M5V1K2",
                    "maritalStatus": "SINGLE"
                }
            }
        }
    }' > /dev/null

RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$STRAPI_URL/api/filings/$PERSONAL_FILING_ID" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"data\": {
            \"filingStatus\": \"$UNDER_REVIEW_STATUS\"
        }
    }")

HTTP_STATUS=$(get_status "$RESPONSE")
BODY=$(get_body "$RESPONSE")

if [[ "$HTTP_STATUS" -lt 400 ]]; then
    print_result "Complete filing should be ACCEPTED" "ACCEPTED" "ACCEPTED" "$BODY"
else
    print_result "Complete filing should be ACCEPTED" "ACCEPTED" "REJECTED (status: $HTTP_STATUS)" "$BODY"
fi

# Reset filing status back for more tests
curl -s -X PUT "$STRAPI_URL/api/filings/$PERSONAL_FILING_ID" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"data\": {
            \"filingStatus\": \"$IN_PROGRESS_STATUS\"
        }
    }" > /dev/null

# =============================================================================
# TEST CATEGORY 2: EDGE CASES
# =============================================================================
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  CATEGORY 2: EDGE CASES${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# -----------------------------------------------------------------------------
# TEST 2.1: Empty string values (not null, but "")
# -----------------------------------------------------------------------------
echo -e "${YELLOW}TEST 2.1: Empty string values should be treated as missing${NC}"

curl -s -X PUT "$STRAPI_URL/api/filings/$PERSONAL_FILING_ID" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "data": {
            "filingData": {
                "personalInfo": {
                    "firstName": "John",
                    "lastName": "Doe",
                    "sin": "",
                    "dateOfBirth": "1990-01-01",
                    "phoneNumber": "416-555-1234",
                    "streetNumber": "123",
                    "streetName": "Main St",
                    "city": "Toronto",
                    "province": "ON",
                    "postalCode": "M5V1K2",
                    "maritalStatus": "SINGLE"
                }
            }
        }
    }' > /dev/null

RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$STRAPI_URL/api/filings/$PERSONAL_FILING_ID" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"data\": {
            \"filingStatus\": \"$UNDER_REVIEW_STATUS\"
        }
    }")

HTTP_STATUS=$(get_status "$RESPONSE")
BODY=$(get_body "$RESPONSE")

if [[ "$HTTP_STATUS" -ge 400 ]]; then
    print_result "Empty string SIN should be REJECTED" "REJECTED" "REJECTED" "$BODY"
else
    print_result "Empty string SIN should be REJECTED" "REJECTED" "ACCEPTED (status: $HTTP_STATUS)" "$BODY"
fi

# -----------------------------------------------------------------------------
# TEST 2.2: Null values
# -----------------------------------------------------------------------------
echo -e "${YELLOW}TEST 2.2: Null values should be treated as missing${NC}"

curl -s -X PUT "$STRAPI_URL/api/filings/$PERSONAL_FILING_ID" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "data": {
            "filingData": {
                "personalInfo": {
                    "firstName": "John",
                    "lastName": null,
                    "sin": "123-456-789",
                    "dateOfBirth": "1990-01-01",
                    "phoneNumber": "416-555-1234",
                    "streetNumber": "123",
                    "streetName": "Main St",
                    "city": "Toronto",
                    "province": "ON",
                    "postalCode": "M5V1K2",
                    "maritalStatus": "SINGLE"
                }
            }
        }
    }' > /dev/null

RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$STRAPI_URL/api/filings/$PERSONAL_FILING_ID" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"data\": {
            \"filingStatus\": \"$UNDER_REVIEW_STATUS\"
        }
    }")

HTTP_STATUS=$(get_status "$RESPONSE")
BODY=$(get_body "$RESPONSE")

if [[ "$HTTP_STATUS" -ge 400 ]]; then
    print_result "Null lastName should be REJECTED" "REJECTED" "REJECTED" "$BODY"
else
    print_result "Null lastName should be REJECTED" "REJECTED" "ACCEPTED (status: $HTTP_STATUS)" "$BODY"
fi

# -----------------------------------------------------------------------------
# TEST 2.3: Whitespace-only values
# -----------------------------------------------------------------------------
echo -e "${YELLOW}TEST 2.3: Whitespace-only values should be treated as missing${NC}"

curl -s -X PUT "$STRAPI_URL/api/filings/$PERSONAL_FILING_ID" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "data": {
            "filingData": {
                "personalInfo": {
                    "firstName": "   ",
                    "lastName": "Doe",
                    "sin": "123-456-789",
                    "dateOfBirth": "1990-01-01",
                    "phoneNumber": "416-555-1234",
                    "streetNumber": "123",
                    "streetName": "Main St",
                    "city": "Toronto",
                    "province": "ON",
                    "postalCode": "M5V1K2",
                    "maritalStatus": "SINGLE"
                }
            }
        }
    }' > /dev/null

RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$STRAPI_URL/api/filings/$PERSONAL_FILING_ID" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"data\": {
            \"filingStatus\": \"$UNDER_REVIEW_STATUS\"
        }
    }")

HTTP_STATUS=$(get_status "$RESPONSE")
BODY=$(get_body "$RESPONSE")

# Note: This test may pass if backend doesn't trim whitespace - that's a minor issue
echo "  (Note: Whitespace handling depends on backend trim logic)"
if [[ "$HTTP_STATUS" -ge 400 ]]; then
    print_result "Whitespace-only firstName" "REJECTED" "REJECTED" "$BODY"
else
    print_result "Whitespace-only firstName" "REJECTED or ACCEPTED" "ACCEPTED (status: $HTTP_STATUS)" "$BODY"
fi

# =============================================================================
# TEST CATEGORY 3: CORPORATE FILING VALIDATION
# =============================================================================
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  CATEGORY 3: CORPORATE FILING TESTS${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Get or create a corporate filing
echo "Getting/creating test CORPORATE filing..."
CORPORATE_FILING_ID=$(curl -s -X GET "$STRAPI_URL/api/filings?filters[filingType][type][\$eq]=CORPORATE&filters[filingStatus][statusCode][\$ne]=UNDER_REVIEW&pagination[limit]=1" \
    -H "Authorization: Bearer $AUTH_TOKEN" | jq -r '.data[0].documentId // .data[0].id // empty')

if [[ -z "$CORPORATE_FILING_ID" || "$CORPORATE_FILING_ID" == "null" ]]; then
    echo "No existing corporate filing found. Creating new one..."
    # Create through service would be needed
fi

if [[ -n "$CORPORATE_FILING_ID" && "$CORPORATE_FILING_ID" != "null" ]]; then
    echo "Using corporate filing: $CORPORATE_FILING_ID"

    # -----------------------------------------------------------------------------
    # TEST 3.1: Submit corporate filing without business number
    # -----------------------------------------------------------------------------
    echo -e "${YELLOW}TEST 3.1: Corporate filing without business number${NC}"

    # First, get the corporate-filing child record
    CORP_CHILD_ID=$(curl -s -X GET "$STRAPI_URL/api/corporate-filings?filters[filing][documentId][\$eq]=$CORPORATE_FILING_ID" \
        -H "Authorization: Bearer $AUTH_TOKEN" | jq -r '.data[0].documentId // .data[0].id // empty')

    if [[ -n "$CORP_CHILD_ID" && "$CORP_CHILD_ID" != "null" ]]; then
        # Update with missing business number
        curl -s -X PUT "$STRAPI_URL/api/corporate-filings/$CORP_CHILD_ID" \
            -H "Authorization: Bearer $AUTH_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{
                "data": {
                    "legalName": "Test Corp Inc.",
                    "businessNumber": null,
                    "formData": {
                        "corpInfo.legalName": "Test Corp Inc."
                    }
                }
            }' > /dev/null
    fi

    RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$STRAPI_URL/api/filings/$CORPORATE_FILING_ID" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"data\": {
                \"filingStatus\": \"$UNDER_REVIEW_STATUS\"
            }
        }")

    HTTP_STATUS=$(get_status "$RESPONSE")
    BODY=$(get_body "$RESPONSE")

    if [[ "$HTTP_STATUS" -ge 400 ]]; then
        print_result "Corporate without business number should be REJECTED" "REJECTED" "REJECTED" "$BODY"
    else
        print_result "Corporate without business number should be REJECTED" "REJECTED" "ACCEPTED (status: $HTTP_STATUS)" "$BODY"
    fi

    # -----------------------------------------------------------------------------
    # TEST 3.2: Submit corporate filing without legal name
    # -----------------------------------------------------------------------------
    echo -e "${YELLOW}TEST 3.2: Corporate filing without legal name${NC}"

    if [[ -n "$CORP_CHILD_ID" && "$CORP_CHILD_ID" != "null" ]]; then
        curl -s -X PUT "$STRAPI_URL/api/corporate-filings/$CORP_CHILD_ID" \
            -H "Authorization: Bearer $AUTH_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{
                "data": {
                    "legalName": null,
                    "businessNumber": "123456789RC0001",
                    "formData": {
                        "corpInfo.businessNumber": "123456789RC0001"
                    }
                }
            }' > /dev/null
    fi

    RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$STRAPI_URL/api/filings/$CORPORATE_FILING_ID" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"data\": {
                \"filingStatus\": \"$UNDER_REVIEW_STATUS\"
            }
        }")

    HTTP_STATUS=$(get_status "$RESPONSE")
    BODY=$(get_body "$RESPONSE")

    if [[ "$HTTP_STATUS" -ge 400 ]]; then
        print_result "Corporate without legal name should be REJECTED" "REJECTED" "REJECTED" "$BODY"
    else
        print_result "Corporate without legal name should be REJECTED" "REJECTED" "ACCEPTED (status: $HTTP_STATUS)" "$BODY"
    fi
else
    echo -e "${YELLOW}Skipping corporate tests - no filing available${NC}"
fi

# =============================================================================
# TEST CATEGORY 4: TRUST FILING VALIDATION
# =============================================================================
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  CATEGORY 4: TRUST FILING TESTS${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Get or create a trust filing
echo "Getting/creating test TRUST filing..."
TRUST_FILING_ID=$(curl -s -X GET "$STRAPI_URL/api/filings?filters[filingType][type][\$eq]=TRUST&filters[filingStatus][statusCode][\$ne]=UNDER_REVIEW&pagination[limit]=1" \
    -H "Authorization: Bearer $AUTH_TOKEN" | jq -r '.data[0].documentId // .data[0].id // empty')

if [[ -n "$TRUST_FILING_ID" && "$TRUST_FILING_ID" != "null" ]]; then
    echo "Using trust filing: $TRUST_FILING_ID"

    # -----------------------------------------------------------------------------
    # TEST 4.1: Submit trust filing without trust name
    # -----------------------------------------------------------------------------
    echo -e "${YELLOW}TEST 4.1: Trust filing without trust name${NC}"

    TRUST_CHILD_ID=$(curl -s -X GET "$STRAPI_URL/api/trust-filings?filters[filing][documentId][\$eq]=$TRUST_FILING_ID" \
        -H "Authorization: Bearer $AUTH_TOKEN" | jq -r '.data[0].documentId // .data[0].id // empty')

    if [[ -n "$TRUST_CHILD_ID" && "$TRUST_CHILD_ID" != "null" ]]; then
        curl -s -X PUT "$STRAPI_URL/api/trust-filings/$TRUST_CHILD_ID" \
            -H "Authorization: Bearer $AUTH_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{
                "data": {
                    "trustName": null,
                    "accountNumber": "T12345678",
                    "formData": {
                        "trustInfo.accountNumber": "T12345678"
                    }
                }
            }' > /dev/null
    fi

    RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$STRAPI_URL/api/filings/$TRUST_FILING_ID" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"data\": {
                \"filingStatus\": \"$UNDER_REVIEW_STATUS\"
            }
        }")

    HTTP_STATUS=$(get_status "$RESPONSE")
    BODY=$(get_body "$RESPONSE")

    if [[ "$HTTP_STATUS" -ge 400 ]]; then
        print_result "Trust without trust name should be REJECTED" "REJECTED" "REJECTED" "$BODY"
    else
        print_result "Trust without trust name should be REJECTED" "REJECTED" "ACCEPTED (status: $HTTP_STATUS)" "$BODY"
    fi

    # -----------------------------------------------------------------------------
    # TEST 4.2: Submit trust filing without account number
    # -----------------------------------------------------------------------------
    echo -e "${YELLOW}TEST 4.2: Trust filing without account number${NC}"

    if [[ -n "$TRUST_CHILD_ID" && "$TRUST_CHILD_ID" != "null" ]]; then
        curl -s -X PUT "$STRAPI_URL/api/trust-filings/$TRUST_CHILD_ID" \
            -H "Authorization: Bearer $AUTH_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{
                "data": {
                    "trustName": "Test Family Trust",
                    "accountNumber": null,
                    "formData": {
                        "trustInfo.name": "Test Family Trust"
                    }
                }
            }' > /dev/null
    fi

    RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$STRAPI_URL/api/filings/$TRUST_FILING_ID" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"data\": {
                \"filingStatus\": \"$UNDER_REVIEW_STATUS\"
            }
        }")

    HTTP_STATUS=$(get_status "$RESPONSE")
    BODY=$(get_body "$RESPONSE")

    if [[ "$HTTP_STATUS" -ge 400 ]]; then
        print_result "Trust without account number should be REJECTED" "REJECTED" "REJECTED" "$BODY"
    else
        print_result "Trust without account number should be REJECTED" "REJECTED" "ACCEPTED (status: $HTTP_STATUS)" "$BODY"
    fi
else
    echo -e "${YELLOW}Skipping trust tests - no filing available${NC}"
fi

# =============================================================================
# TEST CATEGORY 5: BYPASS ATTEMPTS
# =============================================================================
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  CATEGORY 5: BYPASS ATTEMPT TESTS${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# -----------------------------------------------------------------------------
# TEST 5.1: Direct API call bypassing client-side validation
# -----------------------------------------------------------------------------
echo -e "${YELLOW}TEST 5.1: Direct API submission (bypassing client)${NC}"

# Create a fresh filing with empty data
BYPASS_RESPONSE=$(curl -s -X POST "$STRAPI_URL/api/filings" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "data": {
            "filingType": "PERSONAL",
            "taxYear": 2025,
            "filingData": {}
        }
    }')

BYPASS_FILING_ID=$(echo "$BYPASS_RESPONSE" | jq -r '.data.documentId // .data.id // empty')

if [[ -n "$BYPASS_FILING_ID" && "$BYPASS_FILING_ID" != "null" ]]; then
    # Immediately try to submit
    RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$STRAPI_URL/api/filings/$BYPASS_FILING_ID" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"data\": {
                \"filingStatus\": \"$UNDER_REVIEW_STATUS\"
            }
        }")

    HTTP_STATUS=$(get_status "$RESPONSE")
    BODY=$(get_body "$RESPONSE")

    if [[ "$HTTP_STATUS" -ge 400 ]]; then
        print_result "Direct API bypass should be REJECTED" "REJECTED" "REJECTED" "$BODY"
    else
        print_result "Direct API bypass should be REJECTED" "REJECTED" "ACCEPTED (status: $HTTP_STATUS)" "$BODY"
    fi

    # Cleanup
    curl -s -X DELETE "$STRAPI_URL/api/filings/$BYPASS_FILING_ID" \
        -H "Authorization: Bearer $AUTH_TOKEN" > /dev/null 2>&1
else
    echo -e "${YELLOW}Could not create test filing for bypass test${NC}"
fi

# -----------------------------------------------------------------------------
# TEST 5.2: SQL injection attempt in required field
# -----------------------------------------------------------------------------
echo -e "${YELLOW}TEST 5.2: SQL injection attempt (should still fail validation)${NC}"

if [[ -n "$PERSONAL_FILING_ID" ]]; then
    curl -s -X PUT "$STRAPI_URL/api/filings/$PERSONAL_FILING_ID" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "data": {
                "filingData": {
                    "personalInfo": {
                        "firstName": "John",
                        "lastName": "'; DROP TABLE filings; --",
                        "sin": "123-456-789"
                    }
                }
            }
        }' > /dev/null

    RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$STRAPI_URL/api/filings/$PERSONAL_FILING_ID" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"data\": {
                \"filingStatus\": \"$UNDER_REVIEW_STATUS\"
            }
        }")

    HTTP_STATUS=$(get_status "$RESPONSE")
    BODY=$(get_body "$RESPONSE")

    # Should still be rejected for missing required fields
    if [[ "$HTTP_STATUS" -ge 400 ]]; then
        print_result "SQL injection attempt should be REJECTED (missing fields)" "REJECTED" "REJECTED" "$BODY"
    else
        print_result "SQL injection attempt should be REJECTED (missing fields)" "REJECTED" "ACCEPTED (status: $HTTP_STATUS)" "$BODY"
    fi
fi

# =============================================================================
# FINAL SUMMARY
# =============================================================================
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  TEST SUMMARY${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [[ $FAILED -eq 0 ]]; then
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  ALL TESTS PASSED! ✓${NC}"
    echo -e "${GREEN}========================================${NC}"
    exit 0
else
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}  SOME TESTS FAILED! ✗${NC}"
    echo -e "${RED}========================================${NC}"
    exit 1
fi
