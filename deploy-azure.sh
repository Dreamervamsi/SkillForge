#!/bin/bash

# Azure Deployment Script for SkillForge
# Prerequisites: Azure CLI installed and logged in

set -e

# Configuration
RESOURCE_GROUP="SkillForge"
LOCATION="eastus"
ACR_NAME="skillforgercr"
BACKEND_IMAGE="${ACR_NAME}.azurecr.io/skillforge-backend:latest"
FRONTEND_IMAGE="${ACR_NAME}.azurecr.io/skillforge-frontend:latest"
CONTAINER_APP_ENV="skillforge-env"

echo "=== SkillForge Azure Deployment ==="

# 1. Create Resource Group
echo "Creating resource group..."
az group create --name $RESOURCE_GROUP --location $LOCATION

# 2. Create Azure Container Registry
echo "Creating Azure Container Registry..."
az acr create --resource-group $RESOURCE_GROUP --name $ACR_NAME --sku Basic --admin-enabled true

# 3. Login to ACR
echo "Logging into ACR..."
az acr login --name $ACR_NAME

# 4. Build and push Backend
echo "Building backend Docker image..."
docker build -t $BACKEND_IMAGE ./server
docker push $BACKEND_IMAGE

# 5. Build and push Frontend
echo "Building frontend Docker image..."
docker build -t $FRONTEND_IMAGE ./client/client
docker push $FRONTEND_IMAGE

# 6. Create Container Apps Environment
echo "Creating Container Apps Environment..."
az containerapp env create \
  --name $CONTAINER_APP_ENV \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION

# 7. Deploy Backend
echo "Deploying backend to Azure Container Apps..."
az containerapp create \
  --name skillforge-backend \
  --resource-group $RESOURCE_GROUP \
  --environment $CONTAINER_APP_ENV \
  --image $BACKEND_IMAGE \
  --target-port 8000 \
  --ingress external \
  --cpu 0.5 \
  --memory 1Gi \
  --min-replicas 1 \
  --max-replicas 3 \
  --secrets GEMINI_API_KEY=$GEMINI_API_KEY \
  --env-vars GEMINI_API_KEY=secretref:GEMINI_API_KEY

# Get backend URL
BACKEND_URL=$(az containerapp show \
  --name skillforge-backend \
  --resource-group $RESOURCE_GROUP \
  --query properties.configuration.ingress.fqdn \
  -o tsv)

echo "Backend deployed at: https://$BACKEND_URL"

# 8. Deploy Frontend
echo "Deploying frontend to Azure Container Apps..."
az containerapp create \
  --name skillforge-frontend \
  --resource-group $RESOURCE_GROUP \
  --environment $CONTAINER_APP_ENV \
  --image $FRONTEND_IMAGE \
  --target-port 3000 \
  --ingress external \
  --cpu 0.5 \
  --memory 1Gi \
  --min-replicas 1 \
  --max-replicas 3 \
  --env-vars NEXT_PUBLIC_API_URL="https://$BACKEND_URL"

# Get frontend URL
FRONTEND_URL=$(az containerapp show \
  --name skillforge-frontend \
  --resource-group $RESOURCE_GROUP \
  --query properties.configuration.ingress.fqdn \
  -o tsv)

echo "=== Deployment Complete ==="
echo "Frontend: https://$FRONTEND_URL"
echo "Backend:  https://$BACKEND_URL"
