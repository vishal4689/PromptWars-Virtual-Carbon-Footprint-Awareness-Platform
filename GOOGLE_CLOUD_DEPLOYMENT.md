#!/bin/bash

# ============================================================================
# Quick Google Cloud Deployment - Step by Step Manual Commands
# ============================================================================

# STEP 1: SETUP (Run in Google Cloud Shell or locally with gcloud CLI)
# ====================================================================

# 1.1 Initialize and authenticate
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# 1.2 Enable required APIs
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  sql.googleapis.com \
  artifactregistry.googleapis.com \
  sheets.googleapis.com \
  drive.googleapis.com \
  calendar.googleapis.com \
  bigquery.googleapis.com \
  storage-api.googleapis.com


# STEP 2: SETUP DATABASE (Cloud SQL PostgreSQL)
# ===============================================

# 2.1 Create PostgreSQL instance
gcloud sql instances create carbon-postgres \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1

# 2.2 Create database
gcloud sql databases create carbon_footprint \
  --instance=carbon-postgres

# 2.3 Create database user and set password
gcloud sql users create postgres \
  --instance=carbon-postgres \
  --password

# 2.4 Get connection name (save this)
gcloud sql instances describe carbon-postgres \
  --format='value(connectionName)'


# STEP 3: BUILD & PUSH DOCKER IMAGE
# ===================================

# 3.1 Clone your repository
git clone https://github.com/YOUR_USERNAME/carbon-footprint-platform.git
cd carbon-footprint-platform

# 3.2 Build and push to Container Registry
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/carbon-footprint-api:latest

# Alternative: Build locally and push
docker build -t gcr.io/YOUR_PROJECT_ID/carbon-footprint-api:latest .
docker push gcr.io/YOUR_PROJECT_ID/carbon-footprint-api:latest


# STEP 4: CREATE CLOUD STORAGE BUCKET
# =====================================

gsutil mb gs://YOUR_PROJECT_ID-carbon-reports/
gsutil versioning set on gs://YOUR_PROJECT_ID-carbon-reports/


# STEP 5: CREATE SECRETS
# =======================

# 5.1 Create JWT Secret
echo -n "$(openssl rand -base64 32)" | \
  gcloud secrets create jwt-secret --data-file=-

# 5.2 Create Encryption Key
echo -n "$(openssl rand -base64 32)" | \
  gcloud secrets create encryption-key --data-file=-

# 5.3 View secret (don't commit to repo!)
gcloud secrets versions access latest --secret=jwt-secret


# STEP 6: DEPLOY TO CLOUD RUN
# =============================

# 6.1 Get Cloud SQL connection name
export SQL_CONNECTION_NAME=$(gcloud sql instances describe carbon-postgres --format='value(connectionName)')

# 6.2 Deploy the application
gcloud run deploy carbon-footprint-api \
  --image=gcr.io/YOUR_PROJECT_ID/carbon-footprint-api:latest \
  --platform=managed \
  --region=us-central1 \
  --memory=2Gi \
  --cpu=2 \
  --timeout=3600 \
  --allow-unauthenticated \
  --set-cloudsql-instances=${SQL_CONNECTION_NAME} \
  --set-env-vars=NODE_ENV=production,PORT=3001 \
  --set-secrets="JWT_SECRET=jwt-secret:latest,ENCRYPTION_KEY=encryption-key:latest"

# 6.3 Get the service URL
gcloud run services describe carbon-footprint-api \
  --region=us-central1 \
  --format='value(status.url)'


# STEP 7: SETUP DATABASE CONNECTION
# ====================================

# 7.1 Connect to database from Cloud Shell
gcloud sql connect carbon-postgres --user=postgres

# 7.2 Run migrations (from your app)
npm run db:migrate

# 7.3 Seed initial data
npm run db:seed


# STEP 8: VERIFY DEPLOYMENT
# ===========================

# 8.1 Check service status
gcloud run services describe carbon-footprint-api --region=us-central1

# 8.2 View recent logs
gcloud run logs read carbon-footprint-api --limit=50 --region=us-central1

# 8.3 Test health endpoint
curl https://carbon-footprint-api-xxxxx.run.app/health


# STEP 9: CONFIGURE CUSTOM DOMAIN (Optional)
# =============================================

# 9.1 Map custom domain
gcloud run domain-mappings create \
  --service=carbon-footprint-api \
  --domain=carbon.yourdomain.com \
  --region=us-central1

# 9.2 Update DNS records (provided by gcloud)
# CNAME: carbon.yourdomain.com -> ghs.googleusercontent.com


# STEP 10: SETUP MONITORING & LOGGING
# ======================================

# 10.1 Create log sink for BigQuery
gcloud logging sinks create carbon-bigquery-sink \
  bigquery.googleapis.com/projects/YOUR_PROJECT_ID/datasets/carbon_analytics \
  --log-filter='resource.type="cloud_run_revision" AND resource.labels.service_name="carbon-footprint-api"'

# 10.2 Create BigQuery dataset
bq mk --dataset \
  --location=US \
  carbon_analytics


# STEP 11: ENABLE AUTOSCALING
# ==============================

gcloud run services update carbon-footprint-api \
  --region=us-central1 \
  --min-instances=1 \
  --max-instances=100


# STEP 12: SETUP CI/CD WITH GITHUB
# ==================================

# 12.1 Connect GitHub repository
gcloud builds connect --repo-name=carbon-footprint-platform \
  --repo-owner=YOUR_GITHUB_USERNAME \
  --region=us-central1

# 12.2 Create build trigger
gcloud builds triggers create github \
  --repo-name=carbon-footprint-platform \
  --repo-owner=YOUR_GITHUB_USERNAME \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml


# STEP 13: UPDATE ENVIRONMENT VARIABLES
# ========================================

# After getting URLs, update Cloud Run environment:
gcloud run services update carbon-footprint-api \
  --region=us-central1 \
  --update-env-vars=GOOGLE_REDIRECT_URI=https://carbon-footprint-api-xxxxx.run.app/api/auth/google/callback


# STEP 14: BACKUP & EXPORT DATA
# ===============================

# 14.1 Backup database
gcloud sql backups create carbon-backup \
  --instance=carbon-postgres

# 14.2 Export to Cloud Storage
gcloud sql export sql carbon-postgres \
  gs://YOUR_PROJECT_ID-carbon-reports/backups/carbon-backup.sql \
  --database=carbon_footprint


# ============================================================================
# USEFUL COMMANDS FOR MANAGEMENT
# ============================================================================

# View service information
gcloud run services describe carbon-footprint-api --region=us-central1

# Update service (after new build)
gcloud run deploy carbon-footprint-api \
  --image=gcr.io/YOUR_PROJECT_ID/carbon-footprint-api:latest \
  --region=us-central1

# View real-time logs
gcloud run logs read carbon-footprint-api --limit=100 --region=us-central1 --follow

# Get database password
gcloud sql users describe postgres --instance=carbon-postgres

# Delete service (if needed)
gcloud run services delete carbon-footprint-api --region=us-central1

# View costs
gcloud billing accounts list
gcloud compute billing-accounts get-iam-policy ACCOUNT_ID

# Setup Cloud CDN (for static assets)
gcloud compute backend-services create carbon-cdn \
  --global \
  --protocol=HTTP \
  --enable-cdn

# Monitor quotas
gcloud compute project-info describe --project=YOUR_PROJECT_ID

# Enable billing alerts
gcloud billing budgets create \
  --billing-account=ACCOUNT_ID \
  --display-name="Carbon Platform Budget" \
  --budget-amount=100

# ============================================================================
# TROUBLESHOOTING
# ============================================================================

# Check Cloud Build logs
gcloud builds log $(gcloud builds list --limit=1 --format='value(id)')

# Test Cloud SQL connectivity
gcloud sql connect carbon-postgres --user=postgres

# Check service account permissions
gcloud projects get-iam-policy YOUR_PROJECT_ID \
  --flatten="bindings[].members" \
  --format='value(bindings.members)'

# Verify secrets
gcloud secrets list

# Check artifact registry
gcloud artifacts repositories list --location=us-central1

# ============================================================================
# ENVIRONMENT VARIABLES FOR CLOUD RUN
# ============================================================================

# Full set of recommended environment variables:
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://postgres:PASSWORD@CLOUD_SQL_CONNECTION/carbon_footprint
JWT_SECRET=<use Cloud Secrets>
ENCRYPTION_KEY=<use Cloud Secrets>
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://carbon-footprint-api-xxxxx.run.app/api/auth/google/callback
GOOGLE_SHEETS_API_KEY=your-api-key
GOOGLE_MAPS_API_KEY=your-api-key
GOOGLE_BIGQUERY_PROJECT_ID=your-project-id
GOOGLE_CLOUD_BUCKET=your-project-id-carbon-reports
ALLOWED_ORIGINS=https://carbon-footprint-api-xxxxx.run.app,https://yourdomain.com
LOG_LEVEL=info
ENABLE_GAMIFICATION=true
