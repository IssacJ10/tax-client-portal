# GCP App Engine Deployment Guide - JJElevate Tax Portal

Deploy all 3 applications to Google Cloud App Engine with Cloud SQL for PostgreSQL.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Google Cloud Platform                         │
│                  (northamerica-northeast1 - Montreal)            │
│                                                                  │
│                        App Engine                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Strapi     │  │   Client     │  │   Admin      │          │
│  │   Backend    │  │   Portal     │  │   Dashboard  │          │
│  │  (strapi-dev)│  │ (portal-dev) │  │ (admin-dev)  │          │
│  └──────┬───────┘  └──────────────┘  └──────────────┘          │
│         │                                                        │
│         │  Private connection (Unix socket)                      │
│         ▼                                                        │
│  ┌─────────────────────────────────────┐                        │
│  │          Cloud SQL                   │                        │
│  │        (PostgreSQL 15)               │                        │
│  │    jjelevate-dev-db (db-f1-micro)   │                        │
│  └─────────────────────────────────────┘                        │
│                                                                  │
│  URLs:                                                           │
│  • https://strapi-dev-dot-PROJECT.nn.r.appspot.com              │
│  • https://portal-dev-dot-PROJECT.nn.r.appspot.com              │
│  • https://admin-dev-dot-PROJECT.nn.r.appspot.com               │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

- Google Cloud CLI (`gcloud`) installed
- Node.js 20.x installed locally
- GCP Project with billing enabled

---

## Step 1: Initial GCP Setup (One-time)

```bash
# Set your project ID
export PROJECT_ID="secret-rope-485200-h6"
export REGION="northamerica-northeast1"

# Authenticate
gcloud auth login
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable \
  appengine.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com

# Initialize App Engine (choose northamerica-northeast1)
gcloud app create --region=$REGION
```

---

## Step 2: Create Cloud SQL Instance (One-time)

```bash
# Create Cloud SQL PostgreSQL instance (~5-10 minutes)
gcloud sql instances create jjelevate-dev-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=$REGION \
  --storage-type=SSD \
  --storage-size=10GB \
  --availability-type=zonal

# Set postgres password
gcloud sql users set-password postgres \
  --instance=jjelevate-dev-db \
  --password="YOUR_SECURE_POSTGRES_PASSWORD"

# Create database
gcloud sql databases create jjelevate \
  --instance=jjelevate-dev-db

# Create application user
gcloud sql users create jjelevate_app \
  --instance=jjelevate-dev-db \
  --password="YOUR_APP_PASSWORD"

# Get connection name (save this!)
gcloud sql instances describe jjelevate-dev-db --format="value(connectionName)"
# Output: secret-rope-485200-h6:northamerica-northeast1:jjelevate-dev-db
```

---

## Step 3: Set Up Secrets (One-time)

```bash
# Create secrets for sensitive values
gcloud secrets create strapi-app-keys --replication-policy="automatic"
echo -n "$(openssl rand -base64 16),$(openssl rand -base64 16),$(openssl rand -base64 16),$(openssl rand -base64 16)" | \
  gcloud secrets versions add strapi-app-keys --data-file=-

gcloud secrets create strapi-jwt-secret --replication-policy="automatic"
echo -n "$(openssl rand -base64 32)" | gcloud secrets versions add strapi-jwt-secret --data-file=-

gcloud secrets create strapi-admin-jwt-secret --replication-policy="automatic"
echo -n "$(openssl rand -base64 32)" | gcloud secrets versions add strapi-admin-jwt-secret --data-file=-

gcloud secrets create strapi-api-token-salt --replication-policy="automatic"
echo -n "$(openssl rand -base64 32)" | gcloud secrets versions add strapi-api-token-salt --data-file=-

gcloud secrets create strapi-transfer-token-salt --replication-policy="automatic"
echo -n "$(openssl rand -base64 32)" | gcloud secrets versions add strapi-transfer-token-salt --data-file=-

gcloud secrets create db-password --replication-policy="automatic"
echo -n "YOUR_APP_PASSWORD" | gcloud secrets versions add db-password --data-file=-

gcloud secrets create recaptcha-secret --replication-policy="automatic"
echo -n "6LdhjlYsAAAAAHynun0soO6IEQt-obZViuIiH9rc" | gcloud secrets versions add recaptcha-secret --data-file=-

# Grant App Engine access to secrets
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$PROJECT_ID@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Grant App Engine access to Cloud SQL
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$PROJECT_ID@appspot.gserviceaccount.com" \
  --role="roles/cloudsql.client"
```

---

## Step 4: Deploy Strapi Backend

### 4.1 Update Strapi database config for Cloud SQL

Edit `jjelevate-admin/config/database.ts`:

```typescript
export default ({ env }) => ({
  connection: {
    client: 'postgres',
    connection: {
      host: env('DATABASE_HOST', '/cloudsql/secret-rope-485200-h6:northamerica-northeast1:jjelevate-dev-db'),
      port: env.int('DATABASE_PORT', 5432),
      database: env('DATABASE_NAME', 'jjelevate'),
      user: env('DATABASE_USERNAME', 'jjelevate_app'),
      password: env('DATABASE_PASSWORD', ''),
      ssl: env.bool('DATABASE_SSL', false),
    },
    pool: {
      min: 0,
      max: 5,
    },
  },
});
```

### 4.2 Create .gcloudignore for Strapi

Create `jjelevate-admin/.gcloudignore`:

```
.git
.gitignore
node_modules
.env
.env.*
.cache
.tmp
build
*.log
```

### 4.3 Deploy Strapi

```bash
cd /path/to/jjelevate-admin

# Deploy with environment variables
gcloud app deploy app.yaml \
  --set-env-vars="NODE_ENV=production" \
  --set-env-vars="HOST=0.0.0.0" \
  --set-env-vars="PORT=8080" \
  --set-env-vars="DATABASE_CLIENT=postgres" \
  --set-env-vars="DATABASE_HOST=/cloudsql/secret-rope-485200-h6:northamerica-northeast1:jjelevate-dev-db" \
  --set-env-vars="DATABASE_PORT=5432" \
  --set-env-vars="DATABASE_NAME=jjelevate" \
  --set-env-vars="DATABASE_USERNAME=jjelevate_app" \
  --set-env-vars="DATABASE_PASSWORD=YOUR_APP_PASSWORD" \
  --set-env-vars="APP_KEYS=key1,key2,key3,key4" \
  --set-env-vars="JWT_SECRET=$(gcloud secrets versions access latest --secret=strapi-jwt-secret)" \
  --set-env-vars="ADMIN_JWT_SECRET=$(gcloud secrets versions access latest --secret=strapi-admin-jwt-secret)" \
  --set-env-vars="API_TOKEN_SALT=$(gcloud secrets versions access latest --secret=strapi-api-token-salt)" \
  --set-env-vars="TRANSFER_TOKEN_SALT=$(gcloud secrets versions access latest --secret=strapi-transfer-token-salt)" \
  --set-env-vars="JJ_PORTAL_CAPTCHA_SECRET=6LdhjlYsAAAAAHynun0soO6IEQt-obZViuIiH9rc"

# Get Strapi URL
gcloud app browse -s strapi-dev
# URL: https://strapi-dev-dot-secret-rope-485200-h6.nn.r.appspot.com
```

---

## Step 5: Deploy Client Portal

### 5.1 Create .gcloudignore for Client Portal

Create `tax-client-portal/.gcloudignore`:

```
.git
.gitignore
node_modules
.env
.env.*
.next
*.log
```

### 5.2 Deploy Client Portal

```bash
cd /path/to/tax-client-portal

# Set Strapi URL (from Step 4)
export STRAPI_URL="https://strapi-dev-dot-secret-rope-485200-h6.nn.r.appspot.com"

# Deploy
gcloud app deploy app.yaml \
  --set-env-vars="NODE_ENV=production" \
  --set-env-vars="NEXT_PUBLIC_STRAPI_URL=$STRAPI_URL" \
  --set-env-vars="NEXT_PUBLIC_API_URL=$STRAPI_URL/api" \
  --set-env-vars="JJ_PORTAL_CAPTCHA_KEY=6LdhjlYsAAAAAN-C1EmNPoePjQ--ZlfyrwPD8HrH"

# Get Portal URL
gcloud app browse -s portal-dev
# URL: https://portal-dev-dot-secret-rope-485200-h6.nn.r.appspot.com
```

---

## Step 6: Deploy Admin Dashboard

### 6.1 Create .gcloudignore for Admin Dashboard

Create `JJElevateDashboard/.gcloudignore`:

```
.git
.gitignore
node_modules
.env
.env.*
.next
*.log
```

### 6.2 Deploy Admin Dashboard

```bash
cd /path/to/JJElevateDashboard

# Deploy
gcloud app deploy app.yaml \
  --set-env-vars="NODE_ENV=production" \
  --set-env-vars="NEXT_PUBLIC_STRAPI_URL=$STRAPI_URL" \
  --set-env-vars="NEXT_PUBLIC_API_URL=$STRAPI_URL/api" \
  --set-env-vars="JJ_PORTAL_CAPTCHA_KEY=6LdhjlYsAAAAAN-C1EmNPoePjQ--ZlfyrwPD8HrH"

# Get Admin URL
gcloud app browse -s admin-dev
# URL: https://admin-dev-dot-secret-rope-485200-h6.nn.r.appspot.com
```

---

## Step 7: Update Strapi CORS

After all services are deployed, update Strapi's CORS to allow the App Engine URLs.

Edit `jjelevate-admin/config/middlewares.ts`:

```typescript
export default [
  'strapi::logger',
  'strapi::errors',
  {
    name: 'strapi::cors',
    config: {
      enabled: true,
      origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://portal-dev-dot-secret-rope-485200-h6.nn.r.appspot.com',
        'https://admin-dev-dot-secret-rope-485200-h6.nn.r.appspot.com',
      ],
    },
  },
  'strapi::poweredBy',
  'strapi::security',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
```

Then redeploy Strapi:
```bash
cd /path/to/jjelevate-admin
gcloud app deploy app.yaml
```

---

## Deployed URLs

After deployment, your services will be available at:

| Service | URL |
|---------|-----|
| Strapi Backend | https://strapi-dev-dot-secret-rope-485200-h6.nn.r.appspot.com |
| Strapi Admin Panel | https://strapi-dev-dot-secret-rope-485200-h6.nn.r.appspot.com/admin |
| Client Portal | https://portal-dev-dot-secret-rope-485200-h6.nn.r.appspot.com |
| Admin Dashboard | https://admin-dev-dot-secret-rope-485200-h6.nn.r.appspot.com |

---

## Useful Commands

```bash
# View all services
gcloud app services list

# View logs
gcloud app logs tail -s strapi-dev
gcloud app logs tail -s portal-dev
gcloud app logs tail -s admin-dev

# View specific service
gcloud app browse -s strapi-dev

# Check service status
gcloud app describe

# Delete a service (cleanup)
gcloud app services delete strapi-dev

# Connect to Cloud SQL (debugging)
gcloud sql connect jjelevate-dev-db --user=postgres
```

---

## Cost Estimate (Dev Environment)

| Service | Monthly Cost |
|---------|-------------|
| App Engine (3 services, scales to zero) | ~$5-15 |
| Cloud SQL (db-f1-micro) | ~$10 |
| **Total** | **~$15-25/month** |

*Costs are minimal because App Engine scales to zero when not in use.*

---

## Moving to Production

When ready for production:

1. Create new app.yaml files with `-prod` service names
2. Create production Cloud SQL instance with HA
3. Set up custom domains via App Engine settings
4. Update environment variables for production
5. Configure Cloud Monitoring and alerting
