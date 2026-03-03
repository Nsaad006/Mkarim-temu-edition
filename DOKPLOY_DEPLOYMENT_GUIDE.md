# 🚀 Ultimate Dokploy Deployment Guide for MKARIM SOLUTION

This guide ensures your application runs securely, handles the Prisma database migration correctly, never loses your uploaded images, and protects your server against common VPS issues.

## 🛠 Phase 1: VPS Initial Setup & Security

Since you have a beast of a VPS (4 vCPU, 16GB RAM, 200GB NVMe), it will handle Dokploy effortlessly. We just need to secure it first.

### 1. Connect via SSH
Open your terminal and SSH into your VPS:
```bash
ssh root@<YOUR_VPS_IP>
```

### 2. Basic Security (UFW Firewall)
By default, we want to block everything except SSH, HTTP, and HTTPS. Dokploy relies on HTTP/HTTPS for web traffic.
```bash
# Allow SSH so you don't lock yourself out
ufw allow 22/tcp

# Allow Web Traffic
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3000/tcp  # Dokploy Dashboard Port

# Enable the firewall
ufw enable
```

### 3. Install Dokploy
Dokploy takes just one command to install. It will automatically install Docker and Traefik (the router).
```bash
curl -sSL https://dokploy.com/install.sh | sh
```

Make sure your domain name's DNS records are pointing to your VPS IP:
* `A Record` -> `@` -> `<VPS_IP>`
* `A Record` -> `api` -> `<VPS_IP>`
* `A Record` -> `dokploy` -> `<VPS_IP>` (Optional, to access the dashboard securely)

Once installed, visit `http://<YOUR_VPS_IP>:3000` in your browser. Set up your admin account.

---

## 🗄 Phase 2: Deploy PostgreSQL

1. Open the Dokploy dashboard.
2. Go to **Databases** and click **Create Database**.
3. Select **PostgreSQL** and name it `mkarim_db`.
4. Enter a secure password and standard database configurations.
5. Click **Deploy**.
6. Once deployed, note down the **Internal Connection String** provided by Dokploy (it will look something like `postgresql://postgres:password@mkarim_db:5432/mkarim_db?schema=public`). We will use this in the Backend environment variables.

---

## 🚀 Phase 3: Deploy via Dokploy Composer (Docker Compose)

Instead of deploying the frontend and backend as separate folders, we use Dokploy's **Composer** feature to deploy the entire stack at once using our `docker-compose.yml` file.

### 1. Create the Compose Project
1. Open the Dokploy dashboard.
2. Go to **Composer** -> **Create Compose**.
3. Name it `mkarim-stack` (or similar).
4. Select **GitHub** as the provider and link your repository (`Nsaad006/Mkarim`).
5. Set the **Branch** to `main` (or your production branch).
6. Set the **Compose Path** to `./docker-compose.yml`.

### 2. Environment Variables (.env)
Go to the **Environment** tab inside your Composer project and add all the necessary variables for both the backend and frontend:
```env
# Shared / Backend Env
PORT=3001
NODE_ENV=production
DATABASE_URL=<YOUR_INTERNAL_POSTGRES_CONNECTION_STRING>
FRONTEND_URL=https://<YOUR_MAIN_DOMAIN>
JWT_SECRET=super_secret_key_change_me
# Add your SMTP settings here for NodeMailer

# Frontend Build Env
VITE_API_URL=https://api.yourdomain.com/api
```
*(Make sure to hit Save so these are injected during the build/run process).*

### 3. Deploying & Migrating
1. Click **Deploy**. Dokploy will read your `docker-compose.yml`, build the `backend` and `frontend` images natively, and spin up the containers.
2. Because your backend's `start` script contains `"npx prisma migrate deploy && node dist/server.js"`, the backend will **automatically migrate the database structure BEFORE starting up!**
3. Your `docker-compose.yml` already maps the uploads volume, ensuring you **never lose your images** when you push new code.

### 4. Setting Up Domains
Once the containers are running:
1. Under your deployed Compose project, you may need to map the endpoints to your public domains depending on Dokploy's latest UI for Composer.
2. Usually, for a standard Docker Compose inside Dokploy, you will add **Domains** and point them to the respective service names (`backend` port `3001` mapped to `api.yourdomain.com`, and `frontend` port `80` mapped to `yourdomain.com`).
3. Turn on Let's Encrypt for automatic HTTPS.

### 5. Seeding the Database (Initial Setup Only)
Once the backend container is fully up and running (`Running` status):
1. Go to the **Terminal** tab for the backend container inside Dokploy.
2. Run the seed script to create your admin user, initial products, etc.:
```bash
npm run db:seed
```

---

## 🛡 Phase 5: Solving the High-Spec Server Problems

### 1. Fixing Docker Storage Bloat
Since Docker will eat up your 200GB drive over time with old builds:
1. SSH into your VPS.
2. Open crontab to add a weekly automated cleanup task:
```bash
crontab -e
```
3. Add this line at the bottom to run a full prune every Sunday at 3 AM:
```bash
0 3 * * 0 docker system prune -af >/dev/null 2>&1
```

### 2. Automated PostgreSQL Backups
If the server dies, your data is gone. Let's do a simple daily cron backup of PostgreSQL to a folder on your server (from there, you can easily sync it to an external drive or S3).
1. SSH into your VPS.
2. Install Postgres client tools: `apt install postgresql-client`
3. Add this to your crontab (`crontab -e`) to backup daily at 4 AM:
```bash
0 4 * * * docker exec -t mkarim_db pg_dumpall -U postgres > /root/mkarim_backup_$(date +\%F).sql
```
*(Replace `mkarim_db` with the actual container name Dokploy gave your database).*

### 3. Email Limitations (SMTP)
Remember to use ports **465** or **587** in your NodeMailer configuration inside Dokploy. **Never use port 25.**

---
🎉 **You are fully deployed!**
Every time you `git push` to your main branch, Dokploy will automatically rebuild the frontend and backend, re-apply any new Prisma migrations instantly, and keep all your image `uploads` perfectly safe.
