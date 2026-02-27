# 🧪 Local Docker Testing Guide

This guide will help you test your entire application locally using Docker before you deploy it to your Hostinger VPS. This ensures that the Docker images build correctly and that the services communicate as expected.

---

## **Prerequisites**
1.  **Docker Desktop:** Ensure Docker Desktop is installed and running on your Windows machine.
2.  **Terminal:** Open a terminal in the root of your project (`d:\MKARIM SOLUTION v3.0`).

---

## **Step 1: The Local Test Configuration**
I have created a `docker-compose.local.yml` file specifically for local testing. It includes:
- **`db`**: A PostgreSQL 15 database container.
- **`backend`**: Your backend API (connects to the local `db`).
- **`frontend`**: Your Nginx-served frontend (connects to the `backend`).

---

## **Step 2: Start the Containers**

Run the following command to build and start everything:

```powershell
docker-compose -f docker-compose.local.yml up --build
```

**What this does:**
1.  **Builds** the backend and frontend Docker images.
2.  **Starts** a fresh PostgreSQL database.
3.  **Runs Migrations:** The backend will automatically run `npx prisma migrate deploy` once the DB is ready.
4.  **Exposes Ports:**
    - Frontend: [http://localhost:8080](http://localhost:8080)
    - Backend API: [http://localhost:3001](http://localhost:3001)

---

## **Step 3: Verify the Services**

1.  **Check Backend Health:**
    Open [http://localhost:3001/health](http://localhost:3001/health). You should see `{"status":"ok", ...}`.
2.  **Access the Application:**
    Open [http://localhost:8080](http://localhost:8080) in your browser.
3.  **Check Logs:**
    If something isn't working, look at the terminal logs to see error messages from the specific container.

---

## **Step 4: (Optional) Seed the Database**
Since this is a fresh database, it will be empty. If you want to add your seed data:

1.  Find the backend container ID: `docker ps`
2.  Run the seed command inside the container:
    ```bash
    docker exec -it mkarim-backend-local npm run db:seed
    ```
    *(Note: Ensure your seed script is compatible with a fresh production-like environment)*

---

## **Step 5: Stopping and Cleaning Up**

To stop the services:
```powershell
docker-compose -f docker-compose.local.yml down
```

To stop and **remove all data** (reset the database):
```powershell
docker-compose -f docker-compose.local.yml down -v
```

---

## **Comparison: Local vs. VPS**

| Feature | Local Test (`docker-compose.local.yml`) | VPS Production (`docker-compose.yml`) |
| :--- | :--- | :--- |
| **Port** | 8080 (doesn't conflict with dev) | 80 (Standard Web Port) |
| **Database** | Included in Docker | Often external or separate (configure via `.env`) |
| **URL** | `localhost` | `api.yourdomain.com` or IP |

Once you are happy with how it works locally, follow the **`DOCKER_SETUP_GUIDE.md`** and **`HOSTINGER_DEPLOYMENT_GUIDE.md`** to go live!
