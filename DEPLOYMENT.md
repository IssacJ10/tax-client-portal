# GCP Deployment Guide - JJElevate Tax Portal

This guide covers deploying all 3 applications to Google Cloud Platform using Cloud Run.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Google Cloud Platform                         │
│                  (northamerica-northeast1 - Montreal)            │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Cloud Run   │  │  Cloud Run   │  │  Cloud Run   │          │
│  │  Client      │  │  Strapi      │  │  Admin       │          │
│  │  Portal      │  │  Backend     │  │  Dashboard   │          │
│  │  (Next.js)   │  │  (Node.js)   │  │  (Next.js)   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│         │     ┌───────────┴───────────┐     │                   │
│         │     │   VPC Connector       │     │                   │
│         │     └───────────┬───────────┘     │                   │
│         │                 │                 │                   │
│         │     ┌───────────┴───────────┐     │                   │
│         │     │   Cloud SQL           │     │                   │
│         │     │   (PostgreSQL)        │     │                   │
│         │     └───────────────────────┘     │                   │
│         │                                   │                   │
│         │     ┌───────────────────────┐     │                   │
│         └────►│   Cloud Storage       │◄────┘                   │
│               │   (Documents)         │                         │
│               └───────────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

- Google Cloud CLI (`gcloud`) installed and authenticated
- Docker installed locally
- GCP Project with billing enabled

## Step 1: Initial GCP Setup

```bash
# Set your project ID
export PROJECT_ID="secret-rope-485200-h6"
export REGION="northamerica-northeast1"

# Authenticate and set project
gcloud auth login
gcloud config set project $PROJECT_ID
gcloud config set run/region $REGION

# Enable required APIs
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  vpcaccess.googleapis.com \
  artifactregistry.googleapis.com
```

## Step 2: Create Artifact Registry (for Docker images)

```bash
# Create a Docker repository
gcloud artifacts repositories create jjelevate-apps \
  --repository-format=docker \
  --location=$REGION \
  --description="JJElevate application images"

# Configure Docker to use the registry
gcloud auth configure-docker ${REGION}-docker.pkg.dev
```

## Step 3: Set Up Cloud SQL (PostgreSQL)

```bash
# Create Cloud SQL instance (this takes ~5-10 minutes)
gcloud sql instances create jjelevate-dev-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=$REGION \
  --storage-type=SSD \
  --storage-size=10GB \
  --availability-type=zonal \
  --backup-start-time=03:00 \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=04

# Set root password
gcloud sql users set-password postgres \
  --instance=jjelevate-dev-db \
  --password="YOUR_SECURE_PASSWORD_HERE"

# Create the database
gcloud sql databases create jjelevate \
  --instance=jjelevate-dev-db

# Create application user
gcloud sql users create jjelevate_app \
  --instance=jjelevate-dev-db \
  --password="YOUR_APP_USER_PASSWORD"

# Get the connection name (you'll need this)
gcloud sql instances describe jjelevate-dev-db --format="value(connectionName)"
# Output: secret-rope-485200-h6:northamerica-northeast1:jjelevate-dev-db
```

## Step 4: Create VPC Connector (for Cloud SQL access)

```bash
# Create a VPC connector for Cloud Run to access Cloud SQL
gcloud compute networks vpc-access connectors create jjelevate-connector \
  --region=$REGION \
  --range=10.8.0.0/28

# Verify it was created
gcloud compute networks vpc-access connectors describe jjelevate-connector \
  --region=$REGION
```

## Step 5: Set Up Secret Manager (for sensitive env vars)

```bash
# Create secrets for Strapi
gcloud secrets create strapi-app-keys --replication-policy="automatic"
echo -n "key1,key2,key3,key4" | gcloud secrets versions add strapi-app-keys --data-file=-

gcloud secrets create strapi-jwt-secret --replication-policy="automatic"
echo -n "$(openssl rand -base64 32)" | gcloud secrets versions add strapi-jwt-secret --data-file=-

gcloud secrets create strapi-admin-jwt-secret --replication-policy="automatic"
echo -n "$(openssl rand -base64 32)" | gcloud secrets versions add strapi-admin-jwt-secret --data-file=-

gcloud secrets create strapi-api-token-salt --replication-policy="automatic"
echo -n "$(openssl rand -base64 32)" | gcloud secrets versions add strapi-api-token-salt --data-file=-

gcloud secrets create strapi-transfer-token-salt --replication-policy="automatic"
echo -n "$(openssl rand -base64 32)" | gcloud secrets versions add strapi-transfer-token-salt --data-file=-

gcloud secrets create db-password --replication-policy="automatic"
echo -n "YOUR_APP_USER_PASSWORD" | gcloud secrets versions add db-password --data-file=-

gcloud secrets create recaptcha-secret --replication-policy="automatic"
echo -n "6LdhjlYsAAAAAHynun0soO6IEQt-obZViuIiH9rc" | gcloud secrets versions add recaptcha-secret --data-file=-

# Grant Cloud Run access to secrets
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_ID}@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## Step 6: Deploy Strapi Backend

### 6.1 Create Dockerfile for Strapi

Create `Dockerfile` in `/jjelevate-admin/`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Build Strapi
RUN npm run build

# Expose port
EXPOSE 1337

# Start Strapi
CMD ["npm", "run", "start"]
```

### 6.2 Create .dockerignore

```
node_modules
.env
.env.*
.git
.cache
build
.tmp
```

### 6.3 Build and Deploy

```bash
cd /path/to/jjelevate-admin

# Build the image
docker build -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/jjelevate-apps/strapi:dev .

# Push to Artifact Registry
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/jjelevate-apps/strapi:dev

# Deploy to Cloud Run
gcloud run deploy jjelevate-strapi-dev \
  --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/jjelevate-apps/strapi:dev \
  --platform=managed \
  --region=$REGION \
  --allow-unauthenticated \
  --port=1337 \
  --memory=1Gi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=2 \
  --vpc-connector=jjelevate-connector \
  --set-env-vars="NODE_ENV=production" \
  --set-env-vars="HOST=0.0.0.0" \
  --set-env-vars="PORT=1337" \
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

# Get the URL
gcloud run services describe jjelevate-strapi-dev --format="value(status.url)"
# Output: https://jjelevate-strapi-dev-xxxxx-nn.a.run.app
```

## Step 7: Deploy Client Portal (Next.js)

### 7.1 Create Dockerfile

Create `Dockerfile` in `/tax-client-portal/`:

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build args for environment variables
ARG NEXT_PUBLIC_STRAPI_URL
ARG NEXT_PUBLIC_API_URL
ARG JJ_PORTAL_CAPTCHA_KEY

ENV NEXT_PUBLIC_STRAPI_URL=$NEXT_PUBLIC_STRAPI_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV JJ_PORTAL_CAPTCHA_KEY=$JJ_PORTAL_CAPTCHA_KEY

# Build
RUN npm run build

# Production image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy built assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
```

### 7.2 Update next.config.mjs for standalone output

Add `output: 'standalone'` to your Next.js config:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  env: {
    JJ_PORTAL_CAPTCHA_KEY: process.env.JJ_PORTAL_CAPTCHA_KEY,
  },
}

export default nextConfig
```

### 7.3 Build and Deploy

```bash
cd /path/to/tax-client-portal

# Set the Strapi URL (get this from Step 6)
export STRAPI_URL="https://jjelevate-strapi-dev-xxxxx-nn.a.run.app"

# Build with build args
docker build \
  --build-arg NEXT_PUBLIC_STRAPI_URL=$STRAPI_URL \
  --build-arg NEXT_PUBLIC_API_URL=$STRAPI_URL/api \
  --build-arg JJ_PORTAL_CAPTCHA_KEY=6LdhjlYsAAAAAN-C1EmNPoePjQ--ZlfyrwPD8HrH \
  -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/jjelevate-apps/client-portal:dev .

# Push
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/jjelevate-apps/client-portal:dev

# Deploy
gcloud run deploy jjelevate-portal-dev \
  --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/jjelevate-apps/client-portal:dev \
  --platform=managed \
  --region=$REGION \
  --allow-unauthenticated \
  --port=3000 \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=3

# Get the URL
gcloud run services describe jjelevate-portal-dev --format="value(status.url)"
```

## Step 8: Deploy Admin Dashboard (Next.js)

### 8.1 Create Dockerfile

Create `Dockerfile` in `/JJElevateDashboard/`:

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG NEXT_PUBLIC_STRAPI_URL
ARG NEXT_PUBLIC_API_URL
ARG JJ_PORTAL_CAPTCHA_KEY

ENV NEXT_PUBLIC_STRAPI_URL=$NEXT_PUBLIC_STRAPI_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV JJ_PORTAL_CAPTCHA_KEY=$JJ_PORTAL_CAPTCHA_KEY

RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
```

### 8.2 Update next.config.ts

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  env: {
    JJ_PORTAL_CAPTCHA_KEY: process.env.JJ_PORTAL_CAPTCHA_KEY,
  },
};

export default nextConfig;
```

### 8.3 Build and Deploy

```bash
cd /path/to/JJElevateDashboard

docker build \
  --build-arg NEXT_PUBLIC_STRAPI_URL=$STRAPI_URL \
  --build-arg NEXT_PUBLIC_API_URL=$STRAPI_URL/api \
  --build-arg JJ_PORTAL_CAPTCHA_KEY=6LdhjlYsAAAAAN-C1EmNPoePjQ--ZlfyrwPD8HrH \
  -t ${REGION}-docker.pkg.dev/${PROJECT_ID}/jjelevate-apps/admin-dashboard:dev .

docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/jjelevate-apps/admin-dashboard:dev

gcloud run deploy jjelevate-admin-dev \
  --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/jjelevate-apps/admin-dashboard:dev \
  --platform=managed \
  --region=$REGION \
  --allow-unauthenticated \
  --port=3000 \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=2

gcloud run services describe jjelevate-admin-dev --format="value(status.url)"
```

## Step 9: Update CORS in Strapi

After deployment, update Strapi's CORS configuration to allow the Cloud Run URLs.

Edit `config/middlewares.ts` in Strapi:

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
        'https://jjelevate-portal-dev-xxxxx-nn.a.run.app',
        'https://jjelevate-admin-dev-xxxxx-nn.a.run.app',
        // Add production domains later
      ],
    },
  },
  // ... rest of middlewares
];
```

Then redeploy Strapi.

## Step 10: Verify Deployment

After all services are deployed, you'll have:

| Service | URL |
|---------|-----|
| Client Portal | https://jjelevate-portal-dev-xxxxx.a.run.app |
| Strapi Backend | https://jjelevate-strapi-dev-xxxxx.a.run.app |
| Admin Dashboard | https://jjelevate-admin-dev-xxxxx.a.run.app |

Test each service:
1. **Strapi**: Visit `/admin` to set up admin user
2. **Client Portal**: Register a new user
3. **Admin Dashboard**: Login with admin credentials

## Cost Estimate (Dev Environment)

| Service | Monthly Cost |
|---------|-------------|
| Cloud Run (3 services, minimal usage) | ~$5-15 |
| Cloud SQL (db-f1-micro) | ~$10 |
| Artifact Registry | ~$0.10/GB |
| Cloud Storage | ~$2-5 |
| **Total** | **~$20-35/month** |

*Cloud Run scales to zero when not in use, so dev costs are minimal.*

## Quick Reference Commands

```bash
# View logs
gcloud run services logs read jjelevate-strapi-dev --region=$REGION

# Update a service
gcloud run deploy jjelevate-strapi-dev --image=NEW_IMAGE_URL

# Delete a service (cleanup)
gcloud run services delete jjelevate-strapi-dev --region=$REGION

# List all services
gcloud run services list

# Connect to Cloud SQL (for debugging)
gcloud sql connect jjelevate-dev-db --user=postgres
```

## Moving to Production

When ready for production:
1. Create separate Cloud SQL instance with HA
2. Use separate secrets for production
3. Set up custom domains with Cloud Run domain mapping
4. Configure Cloud CDN for static assets
5. Set up Cloud Monitoring and alerting
6. Enable Cloud Armor for DDoS protection
