#!/bin/bash

# =============================================================================
# GET AUTH TOKEN FOR QA TESTS
# =============================================================================
# Run this first to get a JWT token for testing
# Usage: ./get-auth-token.sh <email> <password>
# =============================================================================

STRAPI_URL="${STRAPI_URL:-http://localhost:1337}"

if [[ -z "$1" || -z "$2" ]]; then
    echo "Usage: ./get-auth-token.sh <email> <password>"
    echo ""
    echo "Example:"
    echo "  ./get-auth-token.sh test@example.com mypassword"
    exit 1
fi

EMAIL="$1"
PASSWORD="$2"

echo "Authenticating with Strapi..."

RESPONSE=$(curl -s -X POST "$STRAPI_URL/api/auth/local" \
    -H "Content-Type: application/json" \
    -d "{
        \"identifier\": \"$EMAIL\",
        \"password\": \"$PASSWORD\"
    }")

TOKEN=$(echo "$RESPONSE" | jq -r '.jwt // empty')

if [[ -z "$TOKEN" || "$TOKEN" == "null" ]]; then
    echo "Authentication failed!"
    echo "Response: $RESPONSE"
    exit 1
fi

echo ""
echo "Authentication successful!"
echo ""
echo "To run the QA tests, execute:"
echo ""
echo "  export AUTH_TOKEN=\"$TOKEN\""
echo "  ./scripts/qa-validation-tests.sh"
echo ""
echo "Or in one line:"
echo ""
echo "  AUTH_TOKEN=\"$TOKEN\" ./scripts/qa-validation-tests.sh"
