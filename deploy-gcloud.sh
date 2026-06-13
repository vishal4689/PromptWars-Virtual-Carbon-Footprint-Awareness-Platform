#!/bin/bash

# ============================================================================
# Google Cloud Deployment Script for Carbon Footprint Platform
# Run this in Google Cloud Shell
# ============================================================================

# Set your project variables
export PROJECT_ID="carbon-footprint-499313"
export REGION="us-central1"
export SERVICE_NAME="carbon-footprint-api"
export IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"
export POSTGRES_INSTANCE="carbon-postgres"
export POSTGRES_DB="carbon_footprint"
export POSTGRES_USER="postgres"

echo "🌍 Carbon Footprint Platform - Google Cloud Deployment"
echo "========================================================"

# Basic checks
if [ ! -f Dockerfile ]; then
  echo "ERROR: Dockerfile not found in current directory. Please run this script from the project root containing Dockerfile." >&2
  exit 1
fi

if [ ! -f package.json ]; then
  echo "ERROR: package.json not found in current directory. Please run this script from the project root." >&2
  exit 1
fi

# Step 1: Set the project
echo "📍 Setting Google Cloud project..."
gcloud config set project ${PROJECT_ID}

# Step 2: Enable required APIs
echo "🔧 Enabling required Google Cloud APIs..."
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  sql.googleapis.com \
  compute.googleapis.com \
  artifactregistry.googleapis.com \
  sheets.googleapis.com \
  drive.googleapis.com \
  calendar.googleapis.com \
  maps-backend.googleapis.com \
  bigquery.googleapis.com \
  storage-api.googleapis.com \
  analyticsadmin.googleapis.com \
  docs.googleapis.com

# Step 3: Create Cloud SQL Instance (PostgreSQL)
echo "🗄️ Creating Cloud SQL PostgreSQL instance..."
gcloud sql instances create ${POSTGRES_INSTANCE} \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=${REGION} \
  --availability-type=REGIONAL \
  --enable-bin-log \
  --backup-start-time=02:00 \
  || echo "Instance already exists"

# Step 4: Create database
echo "📊 Creating database..."
gcloud sql databases create ${POSTGRES_DB} \
  --instance=${POSTGRES_INSTANCE} \
  || echo "Database already exists"

# Step 5: Create Cloud SQL user
echo "👤 Creating database user..."
gcloud sql users create ${POSTGRES_USER} \
  --instance=${POSTGRES_INSTANCE} \
  --password \
  || echo "User already exists"

# Step 6: Get Cloud SQL connection name
export SQL_CONNECTION_NAME=$(gcloud sql instances describe ${POSTGRES_INSTANCE} --format='value(connectionName)')
echo "SQL Connection: ${SQL_CONNECTION_NAME}"

# Step 7: Create Cloud Storage bucket for backups and reports
export BUCKET_NAME="${PROJECT_ID}-carbon-reports"
echo "☁️ Creating Cloud Storage bucket..."
gsutil mb -p ${PROJECT_ID} gs://${BUCKET_NAME}/ \
  || echo "Bucket already exists"

# Set bucket lifecycle policy (delete backups after 30 days)
cat > /tmp/lifecycle.json << EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 30}
      }
    ]
  }
}
EOF
gsutil lifecycle set /tmp/lifecycle.json gs://${BUCKET_NAME}/

# Step 8: Build Docker image
echo "🐳 Building Docker image..."
# Submit current directory as build context (the trailing dot is required)
gcloud builds submit --tag ${IMAGE_NAME}:latest \
  --timeout=1800s \
  --machine-type=E2_HIGHCPU_8 \
  .

# Step 9: Create secrets for environment variables (interactive)
echo "🔐 Creating Cloud Secret Manager secrets..."

echo "Please enter required values. Sensitive values will not be echoed."
read -s -p "Database password for ${POSTGRES_USER}: " DB_PASSWORD; echo
read -p "Google Client ID: " GOOGLE_CLIENT_ID
read -s -p "Google Client Secret: " GOOGLE_CLIENT_SECRET; echo
read -p "Google Sheets API Key: " GOOGLE_SHEETS_API_KEY
read -p "Google Maps API Key: " GOOGLE_MAPS_API_KEY
read -p "Google Analytics ID: " GOOGLE_ANALYTICS_ID
read -p "OAuth Redirect host (e.g. SERVICE_NAME-xxxxx.run.app) [press enter to accept default]: " REDIRECT_HOST
if [ -z "${REDIRECT_HOST}" ]; then
  REDIRECT_HOST="${SERVICE_NAME}-xxxxx.run.app"
fi

cat > /tmp/.env.prod << EOF
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://${POSTGRES_USER}:${DB_PASSWORD}@cloudsql/${SQL_CONNECTION_NAME}/${POSTGRES_DB}
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
GOOGLE_REDIRECT_URI=https://${REDIRECT_HOST}/api/auth/google/callback
GOOGLE_SHEETS_API_KEY=${GOOGLE_SHEETS_API_KEY}
GOOGLE_MAPS_API_KEY=${GOOGLE_MAPS_API_KEY}
GOOGLE_BIGQUERY_PROJECT_ID=${PROJECT_ID}
GOOGLE_CLOUD_BUCKET=${BUCKET_NAME}
GOOGLE_ANALYTICS_ID=${GOOGLE_ANALYTICS_ID}
ALLOWED_ORIGINS=https://${REDIRECT_HOST},https://yourdomain.com
BCRYPT_ROUNDS=10
SESSION_TIMEOUT=3600000
LOG_LEVEL=info
ENABLE_GAMIFICATION=true
ENABLE_SOCIAL_FEATURES=true
ENABLE_EXPORT_FEATURES=true
EOF

# Create/Update secrets in Secret Manager
echo "Creating/updating jwt-secret..."
echo -n "$(grep '^JWT_SECRET=' /tmp/.env.prod | cut -d'=' -f2-)" | gcloud secrets create jwt-secret --replication-policy="automatic" --data-file=- || gcloud secrets versions add jwt-secret --data-file=-

echo "Creating/updating encryption-key..."
echo -n "$(grep '^ENCRYPTION_KEY=' /tmp/.env.prod | cut -d'=' -f2-)" | gcloud secrets create encryption-key --replication-policy="automatic" --data-file=- || gcloud secrets versions add encryption-key --data-file=-

echo "Creating/updating google-client-id..."
echo -n "${GOOGLE_CLIENT_ID}" | gcloud secrets create google-client-id --replication-policy="automatic" --data-file=- || gcloud secrets versions add google-client-id --data-file=-

echo "Creating/updating google-client-secret..."
echo -n "${GOOGLE_CLIENT_SECRET}" | gcloud secrets create google-client-secret --replication-policy="automatic" --data-file=- || gcloud secrets versions add google-client-secret --data-file=-

echo "Creating/updating google-sheets-api-key..."
echo -n "${GOOGLE_SHEETS_API_KEY}" | gcloud secrets create google-sheets-api-key --replication-policy="automatic" --data-file=- || gcloud secrets versions add google-sheets-api-key --data-file=-

echo "Creating/updating google-maps-api-key..."
echo -n "${GOOGLE_MAPS_API_KEY}" | gcloud secrets create google-maps-api-key --replication-policy="automatic" --data-file=- || gcloud secrets versions add google-maps-api-key --data-file=-

echo "Creating/updating google-analytics-id..."
echo -n "${GOOGLE_ANALYTICS_ID}" | gcloud secrets create google-analytics-id --replication-policy="automatic" --data-file=- || gcloud secrets versions add google-analytics-id --data-file=-

# Optional: offer to push repo to GitHub
read -p "Enter GitHub HTTPS repo URL to push code (or leave empty to skip): " GITHUB_REPO
if [ -n "${GITHUB_REPO}" ]; then
  echo "Attempting to push repository to ${GITHUB_REPO} (you may be prompted for credentials)..."
  git init || true
  git remote add origin "${GITHUB_REPO}" 2>/dev/null || git remote set-url origin "${GITHUB_REPO}"
  git add .
  git commit -m "chore: initial deploy" || true
  git branch -M main || true
  git push -u origin main || echo "Push failed; please push manually from Cloud Shell or your machine."
fi

# Step 10: Deploy to Cloud Run
echo "🚀 Deploying to Google Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image=${IMAGE_NAME}:latest \
  --platform=managed \
  --region=${REGION} \
  --memory=2Gi \
  --cpu=2 \
  --timeout=3600 \
  --max-instances=100 \
  --min-instances=1 \
  --allow-unauthenticated \
  --set-cloudsql-instances=${SQL_CONNECTION_NAME} \
  --set-env-vars="NODE_ENV=production,PORT=3001,GOOGLE_BIGQUERY_PROJECT_ID=${PROJECT_ID},GOOGLE_CLOUD_BUCKET=${BUCKET_NAME}" \
  --set-secrets="JWT_SECRET=jwt-secret:latest,ENCRYPTION_KEY=encryption-key:latest" \
  --update-on-deploy

# Step 11: Get the service URL
export SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region=${REGION} --format='value(status.url)')
echo "✅ Service deployed at: ${SERVICE_URL}"

# Step 12: Setup continuous deployment (optional)
echo "⚙️ Setting up Cloud Build for CI/CD..."
gcloud builds create-from-github \
  --repo-name=carbon-footprint-platform \
  --repo-owner=your-github-username \
  --branch-pattern="^main$" \
  || echo "CI/CD configuration already exists or skipped"

# Step 13: Setup monitoring
echo "📈 Setting up Cloud Monitoring..."
gcloud monitoring policies create \
  --notification-channels=YOUR_NOTIFICATION_CHANNEL_ID \
  --display-name="Carbon Platform - API Health" \
  --condition-display-name="API Response Time" \
  --condition-threshold-value=2000 \
  || echo "Monitoring policy already exists"

# Step 14: Create BigQuery dataset
echo "📊 Creating BigQuery dataset..."
bq mk --dataset \
  --location=${REGION} \
  --description="Carbon Footprint Analytics" \
  carbon_analytics \
  || echo "Dataset already exists"

# Create BigQuery tables
echo "Creating BigQuery tables..."
bq mk --table carbon_analytics.activities schema.json
bq mk --table carbon_analytics.user_emissions schema.json
bq mk --table carbon_analytics.monthly_emissions schema.json

# Step 15: Configure CORS for APIs
echo "🔄 Configuring CORS..."
cat > /tmp/cors.json << EOF
[
  {
    "origin": ["*"],
    "method": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "responseHeader": ["Content-Type", "Authorization"],
    "maxAgeSeconds": 3600
  }
]
EOF
gsutil cors set /tmp/cors.json gs://${BUCKET_NAME}/

# Step 16: Setup logging and error reporting
echo "📝 Setting up Cloud Logging..."
gcloud logging sinks create carbon-sink logging.googleapis.com/projects/${PROJECT_ID}/logs \
  --log-filter='resource.type="cloud_run_revision" AND resource.labels.service_name="'${SERVICE_NAME}'"' \
  || echo "Logging sink already exists"

# Step 17: Create service account for Cloud Functions (optional - for scheduled tasks)
echo "👥 Creating service account..."
gcloud iam service-accounts create carbon-app \
  --display-name="Carbon Footprint App" \
  || echo "Service account already exists"

# Grant necessary permissions
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:carbon-app@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:carbon-app@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:carbon-app@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataEditor"

# Step 18: Verify deployment
echo "✔️ Verifying deployment..."
curl ${SERVICE_URL}/health

echo ""
echo "=========================================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "=========================================================="
echo "Service URL: ${SERVICE_URL}"
echo "Project ID: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "Database: ${POSTGRES_INSTANCE}"
echo "Storage Bucket: ${BUCKET_NAME}"
echo ""
echo "📝 Next steps:"
echo "1. Update .env file with Google API credentials"
echo "2. Run database migrations: gcloud sql connect ${POSTGRES_INSTANCE}"
echo "3. Configure custom domain (optional)"
echo "4. Set up monitoring alerts"
echo "5. Enable Cloud CDN for static assets"
echo ""
echo "🔗 Useful commands:"
echo "   View logs: gcloud run logs read ${SERVICE_NAME} --limit=50 --region=${REGION}"
echo "   Update service: gcloud run deploy ${SERVICE_NAME} --image=${IMAGE_NAME}:latest --region=${REGION}"
echo "   View metrics: gcloud monitoring time-series list"
echo ""
