# 🚀 Full Deployment Guide for Hostinger VPS (Ubuntu)

This guide covers everything from setting up the VPS to connecting your domain and ensuring your images persist correctly.

---

## **Prerequisites**
1.  **Hostinger VPS:** Running Ubuntu 22.04 or 24.04 (Recommended).
2.  **Domain Name:** Purchased (e.g., `mystore.com`).
3.  **SSH Access:** You can log in to your VPS terminal.

---

## **Step 1: Initial VPS Setup**

Connect to your VPS:
```bash
ssh root@<YOUR_VPS_IP>
```

Update system and install dependencies (Docker, Git, Nginx):
```bash
# Update system
apt update && apt upgrade -y

# Install Docker & Compose (Modern Plugin)
apt install -y docker.io docker-compose-plugin git nginx certbot python3-certbot-nginx

# Start Docker
systemctl start docker
systemctl enable docker
```

---

## **Step 2: Clone Your Project**

We will set up the project in `/var/www`.

```bash
# Create directory
mkdir -p /var/www/app
cd /var/www/app

# Clone your repository (Change this URL to your REPO)
git clone https://github.com/Nsaad006/Mkarim.git .

# Create a shared volume for images so they persist!
mkdir -p /var/www/app/uploads/products
chmod 777 /var/www/app/uploads/products
```

---

## **Step 3: Configurations (.env)**

You need to create your environment file inside the VPS.

1.  **Create .env file:**
    ```bash
    nano .env
    ```

2.  **Paste your production variables:**
    ```env
    # Database (Postgres inside Docker)
    DATABASE_URL="postgresql://postgres:mysecurepassword@db:5432/nadori?schema=public"
    
    # Backend
    PORT=3001
    NODE_ENV=production
    FRONTEND_URL=https://<YOUR_DOMAIN>
    
    # Security
    JWT_SECRET=super_long_secret_key_change_this
    ```

3.  **Save & Exit:** (Press `Ctrl+X`, then `Y`, then `Enter`).

---

## **Step 4: Update Docker Compose**

Ensure your `docker-compose.yml` is ready for production.
Run `nano docker-compose.yml` and make sure it looks like this:

```yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: mkarim-backend
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - NODE_ENV=production
      - FRONTEND_URL=https://<YOUR_DOMAIN>
    volumes:
      - ./backend/uploads:/app/uploads
    depends_on:
      - db

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        - VITE_API_URL=https://<YOUR_DOMAIN>/api
    container_name: mkarim-frontend
    restart: unless-stopped
    ports:
      - "8080:80"
    environment:
      - PORT=80
      - VITE_API_URL=https://<YOUR_DOMAIN>/api
    depends_on:
      - backend

  db:
    image: postgres:15-alpine
    container_name: mkarim-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: mysecurepassword
      POSTGRES_DB: mkarim_db
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

---

## **Step 5: Start the App**

```bash
docker compose up -d --build
```
*   This will build your frontend and backend and start the database.
*   It automatically runs migrations because of our `start` script change!

---

## **Step 6: Domain & SSL Setup (Nginx)**

Now we expose the app to the world securely.

1.  **Point Domain to VPS IP:**
    *   Go to your **Domain Registrar** (e.g., Godaddy, Namecheap, Hostinger).
    *   Add an **A Record**:
        *   **Host**: `@`
        *   **Value**: `<YOUR_VPS_IP>`
        *   **TTL**: `Auto` or `3600`

2.  **Configure Nginx Reverse Proxy:**
    
    Create a config file for your site:
    ```bash
    nano /etc/nginx/sites-available/myapp
    ```

    Paste this (Replace `<YOUR_DOMAIN>` with your actual domain):
    ```nginx
    server {
        server_name <YOUR_DOMAIN> www.<YOUR_DOMAIN>;

        # Frontend
        location / {
            proxy_pass http://localhost:8080;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        # Backend API Proxy
        location /api/ {
            proxy_pass http://localhost:3001/api/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        # Images (Served Correctly)
        location /uploads {
            proxy_pass http://localhost:3001/uploads;
        }
    }
    ```

3.  **Enable Site & Restart:**
    ```bash
    ln -s /etc/nginx/sites-available/myapp /etc/nginx/sites-enabled/
    nginx -t  # Check for errors
    systemctl restart nginx
    ```

---

## **Step 7: SSL Certificate (HTTPS)**

Secure your site with a free Let's Encrypt certificate.

```bash
certbot --nginx -d <YOUR_DOMAIN> -d www.<YOUR_DOMAIN>
```
*   Follow the prompts (Enter email, agree to terms).
*   It will automatically update Nginx to force HTTPS.

---

## **Done! ✅**

1.  Visit `https://<YOUR_DOMAIN>`.
2.  Your app should be live.
3.  Upload an image -> It will be saved in `/var/www/app/uploads`.
4.  Even if you redeploy docker (`docker-compose down && docker-compose up -d`), your images stay safe!
