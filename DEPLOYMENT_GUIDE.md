# 🚀 Google Cloud Deployment Guide

## Quick Start Commands

### Prerequisites
- Google Cloud Account with billing enabled
- `gcloud` CLI installed
- `docker` installed (optional, for local testing)
- GitHub account connected to Google Cloud

---

## **Option 1: Automated Deployment (Recommended)**

### 1. Make the deployment script executable
```bash
chmod +x deploy-gcloud.sh
```

### 2. Set your variables
```bash
export PROJECT_ID="your-gcp-project-id"
export REGION="us-central1"
```

### 3. Run the automated deployment
```bash
./deploy-gcloud.sh
```

This script will:
- ✅ Enable all required Google APIs
- ✅ Create Cloud SQL PostgreSQL instance
- ✅ Create Cloud Storage bucket
- ✅ Build and push Docker image
- ✅ Deploy to Cloud Run
- ✅ Setup monitoring and logging
- ✅ Configure BigQuery
- ✅ Setup CI/CD

---

## **Option 2: Manual Step-by-Step Deployment**

### Step 1: Initialize Google Cloud
```bash
# Login
gcloud auth login

# Set project
gcloud config set project YOUR_PROJECT_ID

# Enable APIs
gcloud services enable cloudbuild.googleapis.com run.googleapis.com sql.googleapis.com
```

### Step 2: Create PostgreSQL Database
```bash
# Create instance
gcloud sql instances create carbon-postgres \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1

# Create database
gcloud sql databases create carbon_footprint \
  --instance=carbon-postgres

# Create user
gcloud sql users create postgres \
  --instance=carbon-postgres \
  --password
```

### Step 3: Build Docker Image
```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/carbon-footprint-platform.git
cd carbon-footprint-platform

# Build and push
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/carbon-footprint-api:latest
```

### Step 4: Create Cloud Storage Bucket
```bash
gsutil mb gs://YOUR_PROJECT_ID-carbon-reports/
```

### Step 5: Create Secrets
```bash
echo -n "$(openssl rand -base64 32)" | \
  gcloud secrets create jwt-secret --data-file=-

echo -n "$(openssl rand -base64 32)" | \
  gcloud secrets create encryption-key --data-file=-
```

### Step 6: Deploy to Cloud Run
```bash
# Get Cloud SQL connection name
export SQL_CONNECTION=$(gcloud sql instances describe carbon-postgres --format='value(connectionName)')

# Deploy
gcloud run deploy carbon-footprint-api \
  --image=gcr.io/YOUR_PROJECT_ID/carbon-footprint-api:latest \
  --platform=managed \
  --region=us-central1 \
  --memory=2Gi \
  --cpu=2 \
  --allow-unauthenticated \
  --set-cloudsql-instances=${SQL_CONNECTION} \
  --set-secrets="JWT_SECRET=jwt-secret:latest,ENCRYPTION_KEY=encryption-key:latest"
```

### Step 7: Get Service URL
```bash
gcloud run services describe carbon-footprint-api --region=us-central1 --format='value(status.url)'
```

### Step 8: Verify Deployment
```bash
# Test health endpoint
curl https://carbon-footprint-api-xxxxx.run.app/health

# View logs
gcloud run logs read carbon-footprint-api --limit=50 --region=us-central1
```

---

## **Configuration**

### Update Environment Variables
After deployment, update these variables on Cloud Run:

```bash
gcloud run services update carbon-footprint-api \
  --region=us-central1 \
  --update-env-vars=\
GOOGLE_CLIENT_ID=your-client-id,\
GOOGLE_CLIENT_SECRET=your-secret,\
GOOGLE_REDIRECT_URI=https://carbon-footprint-api-xxxxx.run.app/api/auth/google/callback,\
GOOGLE_SHEETS_API_KEY=your-key,\
GOOGLE_MAPS_API_KEY=your-key,\
GOOGLE_BIGQUERY_PROJECT_ID=YOUR_PROJECT_ID,\
GOOGLE_CLOUD_BUCKET=YOUR_PROJECT_ID-carbon-reports,\
ALLOWED_ORIGINS=https://your-domain.com
```

### Database Configuration
1. Connect to database:
```bash
gcloud sql connect carbon-postgres --user=postgres
```

2. Run migrations:
```bash
npm run db:migrate
```

3. Seed data:
```bash
npm run db:seed
```

---

## **Continuous Deployment (CI/CD)**

### Setup GitHub Integration
```bash
# Connect repository
gcloud builds connect \
  --repo-name=carbon-footprint-platform \
  --repo-owner=YOUR_GITHUB_USERNAME \
  --region=us-central1
```

### Create Build Trigger
```bash
gcloud builds triggers create github \
  --repo-name=carbon-footprint-platform \
  --repo-owner=YOUR_GITHUB_USERNAME \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml
```

Now every push to `main` branch will:
- Build Docker image
- Run tests
- Deploy to Cloud Run automatically

---

## **Monitoring & Logging**

### View Logs
```bash
# Real-time logs
gcloud run logs read carbon-footprint-api --limit=100 --follow --region=us-central1

# Logs from specific time
gcloud run logs read carbon-footprint-api --region=us-central1 --limit=500 --sort-by=~time
```

### Setup Monitoring
```bash
# Create log sink to BigQuery
gcloud logging sinks create carbon-bigquery \
  bigquery.googleapis.com/projects/YOUR_PROJECT_ID/datasets/carbon_analytics \
  --log-filter='resource.type="cloud_run_revision"'
```

### View Metrics
```bash
# CPU usage
gcloud monitoring time-series list \
  --filter='metric.type="run.googleapis.com/request_count"'

# Memory usage
gcloud monitoring time-series list \
  --filter='metric.type="run.googleapis.com/container_memory_utilization"'
```

---

## **Domain Configuration (Optional)**

### Map Custom Domain
```bash
gcloud run domain-mappings create \
  --service=carbon-footprint-api \
  --domain=carbon.yourdomain.com \
  --region=us-central1
```

### DNS Update
Update your domain's DNS records (provided by gcloud):
```
Type: CNAME
Name: carbon.yourdomain.com
Value: ghs.googleusercontent.com
```

---

## **Backup & Export**

### Backup Database
```bash
gcloud sql backups create carbon-backup --instance=carbon-postgres
```

### Export to Cloud Storage
```bash
gcloud sql export sql carbon-postgres \
  gs://YOUR_PROJECT_ID-carbon-reports/backups/carbon-$(date +%Y%m%d).sql \
  --database=carbon_footprint
```

### List Backups
```bash
gcloud sql backups list --instance=carbon-postgres
```

---

## **Troubleshooting**

### Service won't deploy
```bash
# Check build logs
gcloud builds log $(gcloud builds list --limit=1 --format='value(id)')

# Check service logs
gcloud run logs read carbon-footprint-api --region=us-central1 --limit=100
```

### Database connection issues
```bash
# Test connection
gcloud sql connect carbon-postgres --user=postgres

# Check instance status
gcloud sql instances describe carbon-postgres
```

### Insufficient permissions
```bash
# Grant necessary permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member=user:YOUR_EMAIL \
  --role=roles/run.admin
```

### Quota exceeded
```bash
# Check quotas
gcloud compute project-info describe --project=YOUR_PROJECT_ID

# Request quota increase via Cloud Console
```

---

## **Cost Optimization**

### Set Min/Max Instances
```bash
gcloud run services update carbon-footprint-api \
  --region=us-central1 \
  --min-instances=0 \
  --max-instances=50
```

### Enable CDN for Static Assets
```bash
gsutil iam ch serviceAccount:cloud-cdn@google.iam.gserviceaccount.com:objectViewer \
  gs://YOUR_PROJECT_ID-carbon-reports/
```

### Setup Budget Alert
```bash
gcloud billing budgets create \
  --billing-account=ACCOUNT_ID \
  --display-name="Carbon Platform" \
  --budget-amount=100 \
  --threshold-rule=percent=80
```

---

## **Useful Commands Reference**

```bash
# View service details
gcloud run services describe carbon-footprint-api --region=us-central1

# Update image (after new build)
gcloud run deploy carbon-footprint-api \
  --image=gcr.io/YOUR_PROJECT_ID/carbon-footprint-api:latest \
  --region=us-central1

# View traffic split
gcloud run services describe carbon-footprint-api --region=us-central1 --format=yaml

# Scale up
gcloud run services update carbon-footprint-api \
  --region=us-central1 \
  --max-instances=100

# Delete service
gcloud run services delete carbon-footprint-api --region=us-central1

# View all services
gcloud run services list

# Get service status
gcloud run services describe carbon-footprint-api --region=us-central1
```

---

## **Post-Deployment Checklist**

- [ ] Service is running and accessible
- [ ] Health endpoint responds (`/health`)
- [ ] Database is connected and migrations completed
- [ ] Secrets are configured
- [ ] Google APIs credentials added
- [ ] Environment variables updated
- [ ] Logging to BigQuery enabled
- [ ] Monitoring alerts configured
- [ ] Backup strategy implemented
- [ ] CI/CD pipeline set up
- [ ] Custom domain configured (if needed)
- [ ] CDN enabled (if needed)

---

## **Support**

For issues or questions:
1. Check Cloud Run logs: `gcloud run logs read carbon-footprint-api --limit=50`
2. Review Cloud Build logs for deployment issues
3. Check Google Cloud documentation
4. Contact Google Cloud support

---

**Deployment Date**: June 2026  
**Version**: 1.0.0  
**Status**: Production Ready 🚀
