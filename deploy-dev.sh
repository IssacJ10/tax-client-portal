#!/bin/bash
# JJElevate Dev Environment Deployment Script

set -e

# Configuration
PROJECT_ID="secret-rope-485200-h6"
REGION="northamerica-northeast1"
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/jjelevate-apps"

# Paths (update these to match your local paths)
STRAPI_PATH="/Users/issacjohnson/Documents/projects/JJElevateAdmin/jjelevate-admin"
CLIENT_PORTAL_PATH="/Users/issacjohnson/Downloads/tax-client-portal"
ADMIN_DASHBOARD_PATH="/Users/issacjohnson/Documents/projects/jjelevate-admindashboard/JJElevateDashboard"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}JJElevate Dev Deployment Script${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if gcloud is authenticated
if ! gcloud auth print-access-token &> /dev/null; then
    echo -e "${RED}Error: Not authenticated with gcloud. Run 'gcloud auth login' first.${NC}"
    exit 1
fi

# Set project
gcloud config set project $PROJECT_ID

# Function to deploy Strapi
deploy_strapi() {
    echo -e "\n${YELLOW}Deploying Strapi Backend...${NC}"
    cd "$STRAPI_PATH"

    docker build -t ${REGISTRY}/strapi:dev .
    docker push ${REGISTRY}/strapi:dev

    gcloud run deploy jjelevate-strapi-dev \
        --image=${REGISTRY}/strapi:dev \
        --platform=managed \
        --region=$REGION \
        --allow-unauthenticated \
        --port=1337 \
        --memory=1Gi \
        --cpu=1 \
        --min-instances=0 \
        --max-instances=2 \
        --vpc-connector=jjelevate-connector \
        --set-env-vars="NODE_ENV=production,HOST=0.0.0.0,PORT=1337" \
        --set-env-vars="DATABASE_CLIENT=postgres" \
        --set-env-vars="DATABASE_HOST=/cloudsql/${PROJECT_ID}:${REGION}:jjelevate-dev-db" \
        --set-env-vars="DATABASE_PORT=5432" \
        --set-env-vars="DATABASE_NAME=jjelevate" \
        --set-env-vars="DATABASE_USERNAME=jjelevate_app" \
        --set-env-vars="DATABASE_SSL=false" \
        --set-secrets="DATABASE_PASSWORD=db-password:latest" \
        --set-secrets="APP_KEYS=strapi-app-keys:latest" \
        --set-secrets="JWT_SECRET=strapi-jwt-secret:latest" \
        --set-secrets="ADMIN_JWT_SECRET=strapi-admin-jwt-secret:latest" \
        --set-secrets="API_TOKEN_SALT=strapi-api-token-salt:latest" \
        --set-secrets="TRANSFER_TOKEN_SALT=strapi-transfer-token-salt:latest" \
        --set-secrets="JJ_PORTAL_CAPTCHA_SECRET=recaptcha-secret:latest" \
        --add-cloudsql-instances=${PROJECT_ID}:${REGION}:jjelevate-dev-db

    STRAPI_URL=$(gcloud run services describe jjelevate-strapi-dev --format="value(status.url)" --region=$REGION)
    echo -e "${GREEN}Strapi deployed at: ${STRAPI_URL}${NC}"
    export STRAPI_URL
}

# Function to deploy Client Portal
deploy_client_portal() {
    if [ -z "$STRAPI_URL" ]; then
        STRAPI_URL=$(gcloud run services describe jjelevate-strapi-dev --format="value(status.url)" --region=$REGION 2>/dev/null || echo "")
        if [ -z "$STRAPI_URL" ]; then
            echo -e "${RED}Error: Strapi URL not found. Deploy Strapi first.${NC}"
            exit 1
        fi
    fi

    echo -e "\n${YELLOW}Deploying Client Portal...${NC}"
    echo -e "Using Strapi URL: ${STRAPI_URL}"
    cd "$CLIENT_PORTAL_PATH"

    docker build \
        --build-arg NEXT_PUBLIC_STRAPI_URL=$STRAPI_URL \
        --build-arg NEXT_PUBLIC_API_URL=$STRAPI_URL/api \
        --build-arg JJ_PORTAL_CAPTCHA_KEY=6LdhjlYsAAAAAN-C1EmNPoePjQ--ZlfyrwPD8HrH \
        -t ${REGISTRY}/client-portal:dev .

    docker push ${REGISTRY}/client-portal:dev

    gcloud run deploy jjelevate-portal-dev \
        --image=${REGISTRY}/client-portal:dev \
        --platform=managed \
        --region=$REGION \
        --allow-unauthenticated \
        --port=3000 \
        --memory=512Mi \
        --cpu=1 \
        --min-instances=0 \
        --max-instances=3

    PORTAL_URL=$(gcloud run services describe jjelevate-portal-dev --format="value(status.url)" --region=$REGION)
    echo -e "${GREEN}Client Portal deployed at: ${PORTAL_URL}${NC}"
}

# Function to deploy Admin Dashboard
deploy_admin_dashboard() {
    if [ -z "$STRAPI_URL" ]; then
        STRAPI_URL=$(gcloud run services describe jjelevate-strapi-dev --format="value(status.url)" --region=$REGION 2>/dev/null || echo "")
        if [ -z "$STRAPI_URL" ]; then
            echo -e "${RED}Error: Strapi URL not found. Deploy Strapi first.${NC}"
            exit 1
        fi
    fi

    echo -e "\n${YELLOW}Deploying Admin Dashboard...${NC}"
    echo -e "Using Strapi URL: ${STRAPI_URL}"
    cd "$ADMIN_DASHBOARD_PATH"

    docker build \
        --build-arg NEXT_PUBLIC_STRAPI_URL=$STRAPI_URL \
        --build-arg NEXT_PUBLIC_API_URL=$STRAPI_URL/api \
        --build-arg JJ_PORTAL_CAPTCHA_KEY=6LdhjlYsAAAAAN-C1EmNPoePjQ--ZlfyrwPD8HrH \
        -t ${REGISTRY}/admin-dashboard:dev .

    docker push ${REGISTRY}/admin-dashboard:dev

    gcloud run deploy jjelevate-admin-dev \
        --image=${REGISTRY}/admin-dashboard:dev \
        --platform=managed \
        --region=$REGION \
        --allow-unauthenticated \
        --port=3000 \
        --memory=512Mi \
        --cpu=1 \
        --min-instances=0 \
        --max-instances=2

    ADMIN_URL=$(gcloud run services describe jjelevate-admin-dev --format="value(status.url)" --region=$REGION)
    echo -e "${GREEN}Admin Dashboard deployed at: ${ADMIN_URL}${NC}"
}

# Main menu
case "${1:-all}" in
    strapi)
        deploy_strapi
        ;;
    portal)
        deploy_client_portal
        ;;
    admin)
        deploy_admin_dashboard
        ;;
    all)
        deploy_strapi
        deploy_client_portal
        deploy_admin_dashboard
        echo -e "\n${GREEN}========================================${NC}"
        echo -e "${GREEN}All services deployed successfully!${NC}"
        echo -e "${GREEN}========================================${NC}"
        echo -e "Strapi: $(gcloud run services describe jjelevate-strapi-dev --format='value(status.url)' --region=$REGION)"
        echo -e "Portal: $(gcloud run services describe jjelevate-portal-dev --format='value(status.url)' --region=$REGION)"
        echo -e "Admin:  $(gcloud run services describe jjelevate-admin-dev --format='value(status.url)' --region=$REGION)"
        ;;
    urls)
        echo -e "\n${GREEN}Deployed Service URLs:${NC}"
        echo -e "Strapi: $(gcloud run services describe jjelevate-strapi-dev --format='value(status.url)' --region=$REGION 2>/dev/null || echo 'Not deployed')"
        echo -e "Portal: $(gcloud run services describe jjelevate-portal-dev --format='value(status.url)' --region=$REGION 2>/dev/null || echo 'Not deployed')"
        echo -e "Admin:  $(gcloud run services describe jjelevate-admin-dev --format='value(status.url)' --region=$REGION 2>/dev/null || echo 'Not deployed')"
        ;;
    *)
        echo "Usage: $0 {strapi|portal|admin|all|urls}"
        echo "  strapi - Deploy Strapi backend only"
        echo "  portal - Deploy Client Portal only"
        echo "  admin  - Deploy Admin Dashboard only"
        echo "  all    - Deploy all services (default)"
        echo "  urls   - Show deployed service URLs"
        exit 1
        ;;
esac
