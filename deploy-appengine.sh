#!/bin/bash
# JJElevate App Engine Deployment Script

set -e

# ===========================================
# CONFIGURATION - UPDATE THESE VALUES
# ===========================================

# GCP Project
PROJECT_ID="secret-rope-485200-h6"
APP_ENGINE_REGION="northamerica-northeast1"  # Montreal (App Engine)
CLOUD_SQL_REGION="northamerica-northeast2"   # Toronto (Database)

# Paths (update if needed)
CMS_PATH="/Users/issacjohnson/Documents/projects/JJElevateAdmin/jjelevate-admin"
CLIENT_PORTAL_PATH="/Users/issacjohnson/Downloads/tax-client-portal"
ADMIN_DASHBOARD_PATH="/Users/issacjohnson/Documents/projects/jjelevate-admindashboard/JJElevateDashboard"

# Database Credentials (UPDATE THIS with your Cloud SQL password!)
DB_PASSWORD="UPDATE_WITH_YOUR_CLOUDSQL_PASSWORD"

# Strapi Secrets (already generated)
APP_KEYS="UPDATE_WITH_YOUR_APP_KEYS"
JWT_SECRET="UPDATE_WITH_YOUR_JWT_SECRET"
ADMIN_JWT_SECRET="UPDATE_WITH_YOUR_ADMIN_JWT_SECRET"
API_TOKEN_SALT="UPDATE_WITH_YOUR_API_TOKEN_SALT"
TRANSFER_TOKEN_SALT="UPDATE_WITH_YOUR_TRANSFER_TOKEN_SALT"

# Google OAuth (for Google Sign-In)
GOOGLE_CLIENT_ID="UPDATE_WITH_YOUR_GOOGLE_CLIENT_ID"
GOOGLE_CLIENT_SECRET="UPDATE_WITH_YOUR_GOOGLE_CLIENT_SECRET"

# reCAPTCHA Keys
RECAPTCHA_SITE_KEY="UPDATE_WITH_YOUR_RECAPTCHA_SITE_KEY"
RECAPTCHA_SECRET_KEY="UPDATE_WITH_YOUR_RECAPTCHA_SECRET_KEY"

# Email Configuration (Google Workspace)
EMAIL_PROVIDER="google"
GOOGLE_SMTP_USER="noreply@jjelevateas.com"
GOOGLE_APP_PASSWORD="UPDATE_WITH_YOUR_GOOGLE_APP_PASSWORD"
SMTP_FROM="noreply@jjelevateas.com"
SMTP_REPLY_TO="admin@citysoftsolutions.com"

# ===========================================
# END CONFIGURATION
# ===========================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}JJElevate App Engine Deployment${NC}"
echo -e "${GREEN}========================================${NC}"

# Set project
gcloud config set project $PROJECT_ID

# Get CMS URL
get_cms_url() {
    echo "https://cms-dev-dot-${PROJECT_ID}.nn.r.appspot.com"
}

# Deploy CMS
deploy_cms() {
    CMS_URL=$(get_cms_url)

    echo -e "\n${YELLOW}Deploying CMS Backend...${NC}"
    cd "$CMS_PATH"

    gcloud app deploy app.yaml --quiet \
        --set-env-vars="NODE_ENV=production" \
        --set-env-vars="HOST=0.0.0.0" \
        --set-env-vars="PORT=8080" \
        --set-env-vars="PUBLIC_URL=${CMS_URL}" \
        --set-env-vars="DATABASE_CLIENT=postgres" \
        --set-env-vars="DATABASE_HOST=/cloudsql/${PROJECT_ID}:${CLOUD_SQL_REGION}:jjelevate-dev-db" \
        --set-env-vars="DATABASE_PORT=5432" \
        --set-env-vars="DATABASE_NAME=jjelevate" \
        --set-env-vars="DATABASE_USERNAME=jjelevate_app" \
        --set-env-vars="DATABASE_PASSWORD=${DB_PASSWORD}" \
        --set-env-vars="DATABASE_SSL=false" \
        --set-env-vars="APP_KEYS=${APP_KEYS}" \
        --set-env-vars="JWT_SECRET=${JWT_SECRET}" \
        --set-env-vars="ADMIN_JWT_SECRET=${ADMIN_JWT_SECRET}" \
        --set-env-vars="API_TOKEN_SALT=${API_TOKEN_SALT}" \
        --set-env-vars="TRANSFER_TOKEN_SALT=${TRANSFER_TOKEN_SALT}" \
        --set-env-vars="GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}" \
        --set-env-vars="GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}" \
        --set-env-vars="JJ_PORTAL_CAPTCHA_SECRET=${RECAPTCHA_SECRET_KEY}" \
        --set-env-vars="EMAIL_PROVIDER=${EMAIL_PROVIDER}" \
        --set-env-vars="GOOGLE_SMTP_USER=${GOOGLE_SMTP_USER}" \
        --set-env-vars="GOOGLE_APP_PASSWORD=${GOOGLE_APP_PASSWORD}" \
        --set-env-vars="SMTP_FROM=${SMTP_FROM}" \
        --set-env-vars="SMTP_REPLY_TO=${SMTP_REPLY_TO}" \
        --set-env-vars="CLIENT_PORTAL_URL=https://portal-dev-dot-${PROJECT_ID}.nn.r.appspot.com"

    echo -e "${GREEN}CMS deployed at: ${CMS_URL}${NC}"
}

# Deploy Client Portal
deploy_portal() {
    CMS_URL=$(get_cms_url)

    echo -e "\n${YELLOW}Deploying Client Portal...${NC}"
    echo -e "Using CMS URL: ${CMS_URL}"
    cd "$CLIENT_PORTAL_PATH"

    gcloud app deploy app.yaml --quiet \
        --set-env-vars="NODE_ENV=production" \
        --set-env-vars="NEXT_PUBLIC_STRAPI_URL=${CMS_URL}" \
        --set-env-vars="NEXT_PUBLIC_API_URL=${CMS_URL}/api" \
        --set-env-vars="JJ_PORTAL_CAPTCHA_KEY=${RECAPTCHA_SITE_KEY}"

    PORTAL_URL="https://portal-dev-dot-${PROJECT_ID}.nn.r.appspot.com"
    echo -e "${GREEN}Client Portal deployed at: ${PORTAL_URL}${NC}"
}

# Deploy Admin Dashboard
deploy_admin() {
    CMS_URL=$(get_cms_url)

    echo -e "\n${YELLOW}Deploying Admin Dashboard...${NC}"
    echo -e "Using CMS URL: ${CMS_URL}"
    cd "$ADMIN_DASHBOARD_PATH"

    gcloud app deploy app.yaml --quiet \
        --set-env-vars="NODE_ENV=production" \
        --set-env-vars="NEXT_PUBLIC_STRAPI_URL=${CMS_URL}" \
        --set-env-vars="NEXT_PUBLIC_API_URL=${CMS_URL}/api" \
        --set-env-vars="JJ_PORTAL_CAPTCHA_KEY=${RECAPTCHA_SITE_KEY}"

    ADMIN_URL="https://admin-dev-dot-${PROJECT_ID}.nn.r.appspot.com"
    echo -e "${GREEN}Admin Dashboard deployed at: ${ADMIN_URL}${NC}"
}

# Show URLs
show_urls() {
    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}Deployed Service URLs${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo -e "CMS Backend:     https://cms-dev-dot-${PROJECT_ID}.nn.r.appspot.com"
    echo -e "CMS Admin:       https://cms-dev-dot-${PROJECT_ID}.nn.r.appspot.com/admin"
    echo -e "Client Portal:   https://portal-dev-dot-${PROJECT_ID}.nn.r.appspot.com"
    echo -e "Admin Dashboard: https://admin-dev-dot-${PROJECT_ID}.nn.r.appspot.com"
}

# Show current config
show_config() {
    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}Current Configuration${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo -e "Project ID:      ${PROJECT_ID}"
    echo -e "Region:          ${REGION}"
    echo -e "Email Provider:  ${EMAIL_PROVIDER}"
    echo -e "SMTP User:       ${GOOGLE_SMTP_USER}"
    echo -e "SMTP From:       ${SMTP_FROM}"
    echo -e ""
    echo -e "${YELLOW}Secrets (showing if set):${NC}"
    echo -e "DB Password:     $([ "$DB_PASSWORD" != "YOUR_DB_PASSWORD" ] && echo '✓ Set' || echo '✗ NOT SET')"
    echo -e "App Keys:        $([ "$APP_KEYS" != "key1,key2,key3,key4" ] && echo '✓ Set' || echo '✗ Using defaults')"
    echo -e "JWT Secret:      $([ "$JWT_SECRET" != "your-jwt-secret" ] && echo '✓ Set' || echo '✗ NOT SET')"
    echo -e "App Password:    $([ "$GOOGLE_APP_PASSWORD" != "YOUR_16_CHAR_APP_PASSWORD" ] && echo '✓ Set' || echo '✗ NOT SET')"
}

# Main menu
case "${1:-help}" in
    cms)
        deploy_cms
        ;;
    portal)
        deploy_portal
        ;;
    admin)
        deploy_admin
        ;;
    all)
        deploy_cms
        deploy_portal
        deploy_admin
        show_urls
        ;;
    urls)
        show_urls
        ;;
    config)
        show_config
        ;;
    logs)
        SERVICE="${2:-cms-dev}"
        echo "Showing logs for $SERVICE..."
        gcloud app logs tail -s $SERVICE
        ;;
    *)
        echo "Usage: $0 {cms|portal|admin|all|urls|config|logs [service]}"
        echo ""
        echo "Commands:"
        echo "  cms     - Deploy CMS backend"
        echo "  portal  - Deploy Client Portal"
        echo "  admin   - Deploy Admin Dashboard"
        echo "  all     - Deploy all services"
        echo "  urls    - Show deployed URLs"
        echo "  config  - Show current configuration"
        echo "  logs    - View logs (default: cms-dev)"
        echo ""
        echo "Examples:"
        echo "  $0 all              # Deploy everything"
        echo "  $0 cms              # Deploy only CMS"
        echo "  $0 config           # Check configuration"
        echo "  $0 logs portal-dev  # View portal logs"
        echo ""
        echo -e "${YELLOW}Before deploying, update the configuration section at the top of this script!${NC}"
        ;;
esac
