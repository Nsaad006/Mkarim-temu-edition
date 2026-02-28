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

## ⚙️ Phase 3: Deploy the Backend (Node.js + Prisma)

### 1. Create the Application
1. Go to **Applications** -> **Create Application**.
2. Name it `mkarim-backend`.
3. Select **GitHub** as the source and link your repository (`Nsaad006/Mkarim`).
4. Set the **Branch** to `main` (or whichever branch you are deploying).
5. Set the **Build Path** to `./backend`.

### 2. Environment Variables
Go to the **Environment** tab and add your `.env` variables:
```env
PORT=3001
NODE_ENV=production
DATABASE_URL=<YOUR_INTERNAL_POSTGRES_CONNECTION_STRING>
FRONTEND_URL=https://<YOUR_MAIN_DOMAIN>
JWT_SECRET=super_secret_key_change_me
# Add your SMTP settings here for NodeMailer (Hostinger Business Email / Resend)
```

### 3. Fixing the Uploads Folder (Docker Persistent Volume)
*Crucial Step so you don't lose images on the next push!*
1. Go to the **Volumes** tab in your Application settings.
2. Add a new **Bind Mount**:
   * **Host Path:** `/var/www/mkarim/uploads`
   * **Container Path:** `/app/uploads`
This physically maps the VPS drive to Docker.

### 4. Deploying & Migrating
1. Click **Deploy**.
2. Because your `package.json` `start` script is `"npx prisma migrate deploy && node dist/server.js"`, the backend will **automatically migrate the database structure (including the `favicon` error field) BEFORE starting up!** This fixes the Railway error you had.

### 5. Seeding the Database (Initial Setup Only)
Once the backend is green (Running):
1. Go to the **Terminal** tab for the backend in Dokploy.
2. Run the seed script manually to insert the admin user, products, and categories:
```bash
npm run db:seed
```

### 6. Set Up Backend Domain
1. Go to the **Domains** tab for the backend.
2. Add your api domain (e.g., `api.yourdomain.com`).
3. Check the box to auto-generate a Let's Encrypt SSL certificate.

---

## 🌐 Phase 4: Deploy the Frontend (Vite + React)

### 1. Create the Application
1. Go to **Applications** -> **Create Application**.
2. Name it `mkarim-frontend`.
3. Select the same **GitHub** repo.
4. Set the **Build Path** to `./frontend`.

### 2. Build Arguments (Crucial for Vite)
Since Vite is a static builder, it needs to know the API URL **during the build process**, not just execution.
1. Go to the **Environment** tab.
2. Add the variable to the **Build Arguments** section (NOT just standard runtime variables):
```env
VITE_API_URL=https://api.yourdomain.com/api
```

### 3. Deploy and Set Domain
1. Click **Deploy**. Dokploy will run the multi-stage Dockerfile and serve the files via Nginx.
2. Once running, go to the **Domains** tab.
3. Add your primary domain (`yourdomain.com` and `www.yourdomain.com`).
4. Enable Let's Encrypt SSL.

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
