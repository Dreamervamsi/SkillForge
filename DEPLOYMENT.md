# SkillForge Azure Deployment Guide

## Prerequisites

1. **Azure CLI installed**
   ```bash
   # Windows (PowerShell)
   winget install Microsoft.AzureCLI

   # Verify installation
   az --version
   ```

2. **Docker installed and running**
   ```bash
   docker --version
   ```

3. **Azure account with subscription**
   - Sign up at [azure.com](https://azure.com) if needed
   - Free tier available for testing

## Quick Deployment

### Option 1: Automated Script (Recommended)

1. **Set your Gemini API key as environment variable**
   ```bash
   # Windows PowerShell
   $env:GEMINI_API_KEY="your_gemini_api_key_here"

   # Linux/Mac
   export GEMINI_API_KEY="your_gemini_api_key_here"
   ```

2. **Login to Azure**
   ```bash
   az login
   ```

3. **Run deployment script**
   ```bash
   # Linux/Mac
   chmod +x deploy-azure.sh
   ./deploy-azure.sh

   # Windows PowerShell
   .\deploy-azure.sh
   ```

### Option 2: Manual Deployment

#### Step 1: Create Azure Resources

```bash
# Create resource group
az group create --name SkillForge --location eastus

# Create Azure Container Registry
az acr create --resource-group SkillForge --name skillforgercr --sku Basic --admin-enabled true
```

#### Step 2: Build and Push Docker Images

```bash
# Login to ACR
az acr login --name skillforgercr

# Build backend
docker build -t skillforgercr.azurecr.io/skillforge-backend:latest ./server
docker push skillforgercr.azurecr.io/skillforge-backend:latest

# Build frontend
docker build -t skillforgercr.azurecr.io/skillforge-frontend:latest ./client/client
docker push skillforgercr.azurecr.io/skillforge-frontend:latest
```

#### Step 3: Create Container Apps Environment

```bash
az containerapp env create \
  --name skillforge-env \
  --resource-group SkillForge \
  --location eastus
```

#### Step 4: Deploy Backend

```bash
az containerapp create \
  --name skillforge-backend \
  --resource-group SkillForge \
  --environment skillforge-env \
  --image skillforgercr.azurecr.io/skillforge-backend:latest \
  --target-port 8000 \
  --ingress external \
  --cpu 0.5 \
  --memory 1Gi \
  --min-replicas 1 \
  --max-replicas 3 \
  --secrets GEMINI_API_KEY=your_actual_key_here \
  --env-vars GEMINI_API_KEY=secretref:GEMINI_API_KEY
```

#### Step 5: Deploy Frontend

```bash
# Get backend URL first
BACKEND_URL=$(az containerapp show \
  --name skillforge-backend \
  --resource-group SkillForge \
  --query properties.configuration.ingress.fqdn \
  -o tsv)

az containerapp create \
  --name skillforge-frontend \
  --resource-group SkillForge \
  --environment skillforge-env \
  --image skillforgercr.azurecr.io/skillforge-frontend:latest \
  --target-port 3000 \
  --ingress external \
  --cpu 0.5 \
  --memory 1Gi \
  --min-replicas 1 \
  --max-replicas 3 \
  --env-vars NEXT_PUBLIC_API_URL="https://$BACKEND_URL"
```

## Local Testing with Docker Compose

Before deploying to Azure, test locally:

```bash
# Set environment variables
cp server/.env.example server/.env
# Edit server/.env with your GEMINI_API_KEY

# Build and run
docker-compose up --build

# Access
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
```

## Managing Environment Variables in Azure

### Via Azure Portal

1. Go to Azure Portal → Container Apps
2. Select your app (skillforge-backend or skillforge-frontend)
3. Navigate to "Environment variables"
4. Add/update variables
5. Click "Save"

### Via Azure CLI

```bash
# Add environment variable to backend
az containerapp update \
  --name skillforge-backend \
  --resource-group SkillForge \
  --set-env-vars NEW_VAR=value

# Add secret (secure)
az containerapp secret set \
  --name skillforge-backend \
  --resource-group SkillForge \
  --secrets SECRET_NAME=secret_value
```

## Monitoring and Logs

### View Logs

```bash
# Backend logs
az containerapp logs show \
  --name skillforge-backend \
  --resource-group SkillForge \
  --follow

# Frontend logs
az containerapp logs show \
  --name skillforge-frontend \
  --resource-group SkillForge \
  --follow
```

### View Metrics

Azure Portal → Container Apps → Select app → Metrics

## Scaling

### Manual Scaling

```bash
az containerapp update \
  --name skillforge-backend \
  --resource-group SkillForge \
  --min-replicas 2 \
  --max-replicas 10
```

### Auto-scaling (Based on HTTP requests)

```bash
az containerapp update \
  --name skillforge-backend \
  --resource-group SkillForge \
  --scale-rule-name http-scale-rule \
  --scale-rule-type http \
  --scale-rule-http-concurrency 10
```

## Cleanup

```bash
# Delete entire resource group
az group delete --name SkillForge --yes
```

## Cost Estimation

- **Azure Container Registry**: $0.167/day (Basic SKU)
- **Container Apps (Free tier)**: 180,000 vCPU-seconds/month free
- **Typical usage**: <$20/month for small-scale app

## Troubleshooting

### Container not starting
```bash
# Check logs
az containerapp logs show --name skillforge-backend --resource-group SkillForge

# Check revision
az containerapp revision list --name skillforge-backend --resource-group SkillForge
```

### Build failures
- Ensure Docker daemon is running
- Check Dockerfile syntax
- Verify all dependencies are in requirements.txt/package.json

### Environment variables not working
- Ensure secrets are set via `--secrets` flag
- Use `secretref:SECRET_NAME` in `--env-vars`
- Restart container after updating variables

## Next Steps

1. Set up custom domain (optional)
2. Configure SSL/TLS certificates
3. Set up CI/CD with GitHub Actions
4. Configure monitoring with Azure Monitor
5. Set up database (if needed)
