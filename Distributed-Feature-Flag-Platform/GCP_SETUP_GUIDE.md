# GCP Infrastructure Setup Guide

This guide provides the `gcloud` commands required to provision the necessary infrastructure for the Distributed Feature Flag Platform in the `homegenie-prod` project.

## 1. Set Project & Region
```bash
# Set the active project
gcloud config set project homegenie-prod

# Set default region and zone
gcloud config set run/region us-central1
gcloud config set compute/region us-central1
gcloud config set compute/zone us-central1-a
```

## 2. Enable Required APIs
```bash
gcloud services enable \
    pubsub.googleapis.com \
    sqladmin.googleapis.com \
    redis.googleapis.com \
    run.googleapis.com \
    secretmanager.googleapis.com \
    artifactregistry.googleapis.com
```

## 3. Provision Pub/Sub
```bash
# Create the main topic for flag updates
gcloud pubsub topics create flag-updates

# Create subscription for Webhook Service
gcloud pubsub subscriptions create webhook-service-sub --topic=flag-updates

# Create subscription for Data Plane (optional, if using push-based invalidation)
gcloud pubsub subscriptions create data-plane-sub --topic=flag-updates
```

## 4. Provision Cloud SQL (PostgreSQL)
```bash
# Create a PostgreSQL instance (Small instance for dev/test)
gcloud sql instances create ff-platform-db \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=us-central1 \
    --root-password=STRONG_PASSWORD_HERE

# Create the specific database
gcloud sql databases create ff_platform --instance=ff-platform-db
```

## 5. Provision Memorystore (Redis)
```bash
# Create a Redis instance for caching
gcloud redis instances create ff-platform-cache \
    --size=1 \
    --region=us-central1 \
    --redis-version=redis_7_0
```

## 6. Setup Secret Manager
```bash
# Store the database password securely
echo -n "STRONG_PASSWORD_HERE" | gcloud secrets create db-password --data-file=-

# Store the service account key if needed by apps
gcloud secrets create gcp-sa-key --data-file="d:/System Design Practical Projects/gcs-signed-url-system/homegenie-prod-97c358d8431e.json"
```

## 7. Artifact Registry (For Docker Images)
```bash
# Create a repository for your microservices
gcloud artifacts repositories create ff-platform-repo \
    --repository-format=docker \
    --location=us-central1 \
    --description="Docker repository for Feature Flag services"
```

## 8. IAM Permissions
Ensure your service account has the necessary roles:
```bash
# Replace with your service account email
SA_EMAIL="gcs-uploader-service@homegenie-prod.iam.gserviceaccount.com"

# Grant Pub/Sub Publisher/Subscriber
gcloud projects add-iam-policy-binding homegenie-prod \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/pubsub.editor"

# Grant Cloud SQL Client
gcloud projects add-iam-policy-binding homegenie-prod \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/cloudsql.client"

# Grant Secret Manager Access
gcloud projects add-iam-policy-binding homegenie-prod \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/secretmanager.secretAccessor"
```

## 🚀 Next Steps: Deployment

**IMPORTANT**: Ensure you are in the project root directory (`Distributed-Feature-Flag-Platform`) before running these commands.

```bash
# 1. Navigate to the project root
cd Distributed-Feature-Flag-Platform

# 2. Build and Push Control Plane
gcloud builds submit --tag us-central1-docker.pkg.dev/homegenie-prod/ff-platform-repo/control-plane ./control-plane

# 3. Build and Push Data Plane
gcloud builds submit --tag us-central1-docker.pkg.dev/homegenie-prod/ff-platform-repo/data-plane ./data-plane

# 4. Build and Push Webhook Service
gcloud builds submit --tag us-central1-docker.pkg.dev/homegenie-prod/ff-platform-repo/webhook-service ./webhook-service
```

## 🚢 Cloud Run Deployment
Once the images are built, deploy them to Cloud Run:

```bash
# Deploy Control Plane
gcloud run deploy control-plane \
    --image us-central1-docker.pkg.dev/homegenie-prod/ff-platform-repo/control-plane \
    --add-cloudsql-instances homegenie-prod:us-central1:ff-platform-db \
    --update-env-vars SPRING_DATASOURCE_PASSWORD_SECRET=db-password \
    --allow-unauthenticated
```
