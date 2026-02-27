# 🛡️ Data Safety & Deployment Strategy

This guide explains how your data stays safe during updates and how to implement a professional backup strategy on your Hostinger VPS.

---

## **1. Why your data is NOT lost on updates**

When you update your app (e.g., `git pull` and `docker compose up --build`), your data stays safe because of **Docker Volumes**.

In your `docker-compose.yml`, we have these lines:
```yaml
services:
  db:
    volumes:
      - postgres_data:/var/lib/postgresql/data # <--- The "Safe Box"

volumes:
  postgres_data: # <--- Persistent Storage
```

*   **The Container** is like a hotel room: You can delete it and recreate it (an update).
*   **The Volume** is like a safe in the hotel: If the room is renovated (the update), the safe stays exactly where it is. When the new room is ready, it reconnects to the same safe.
*   **Result:** Your products, orders, and users stay exactly where they are.

---

## **2. Professional Update Workflow**

To update your app on the VPS without losing data or causing long downtime:

1.  **Push** your code to GitHub from your local machine.
2.  **SSH** into your VPS.
3.  **Navigate** to the app folder: `cd /var/www/app`.
4.  **Pull** the new code: `git pull`.
5.  **Rebuild & Restart:**
    ```bash
    docker compose up -d --build
    ```
    *Docker will detect which files changed, rebuild only those parts, and restart the containers. The database volume remains untouched.*

---

## **3. Data Security Strategy**

Storing data in a volume is good, but "one location is no location." Here is the strategy to secure your data from hardware failure or accidental deletion.

### **A. Local Image Backups**
Your product images are stored in `./backend/uploads`.
*   **Strategy:** We map this to a folder on the VPS disk. Even if the backend container is destroyed, the images are literally files in `/var/www/app/backend/uploads`.

### **B. Automated Database Backups (The "Gold Standard")**
You should create a "Dump" of your database daily. I have created a script for you.

#### **Create the Backup Script**
1. On your VPS, create a backup folder: `mkdir -p /var/www/backups/db`
2. Create the script: `nano /var/www/app/backup_db.sh`
3. Paste this:
```bash
#!/bin/bash
# Configuration
BACKUP_DIR="/var/www/backups/db"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DATABASE_NAME="mkarim_db" # Match your .env
USER="postgres"

# Create backup
docker exec mkarim-db pg_dump -U $USER $DATABASE_NAME > $BACKUP_DIR/db_backup_$TIMESTAMP.sql

# Remove backups older than 7 days to save space
find $BACKUP_DIR -type f -name "*.sql" -mtime +7 -delete

echo "Backup saved: $BACKUP_DIR/db_backup_$TIMESTAMP.sql"
```
4. Make it executable: `chmod +x /var/www/app/backup_db.sh`

### **C. Automation with Cron**
Set it to run every night at 2:00 AM:
1. Run `crontab -e`.
2. Add this line at the bottom:
   ```bash
   0 2 * * * /var/www/app/backup_db.sh
   ```

---

## **4. Emergency Recovery**

If you ever need to restore your database from a backup:
```bash
# 1. Stop the app
docker compose down

# 2. Start ONLY the DB
docker compose up -d db

# 3. Restore the file (replace [FILENAME] with your backup)
cat /var/www/backups/db/[FILENAME].sql | docker exec -i mkarim-db psql -U postgres -d mkarim_db

# 4. Start the rest
docker compose up -d
```

---

## **4. Layer 4: Off-site Backups (Outside the VPS)**

Storing backups on the same machine is not enough. If the VPS disk fails or the server is deleted, you lose your backups too. Here are the best strategies to get your data **off the VPS**.

### **Option A: The Simple Manual Way (Command Line)**
You can download the latest backup directly to your own local computer using `scp` (Secure Copy).

Run this command **on your local computer terminal** (not on the VPS):
```bash
scp root@<YOUR_VPS_IP>:/var/www/backups/db/db_backup_latest.sql C:\Backups\
```

### **Option B: Automated Cloud Sync (Recommended)**
The professional way is to automatically sync your backups to a cloud provider like **Google Drive, Dropbox, or AWS S3** using a tool called `rclone`.

#### **1. Install rclone on VPS:**
```bash
sudo -v && curl https://rclone.org/install.sh | sudo bash
```

#### **2. Configure rclone:**
Run `rclone config` and follow the interactive prompts to connect your Google Drive or Dropbox. Name your connection `remote_backup`.

#### **3. Update your Backup Script:**
Modify your `backup_db.sh` to include a sync line at the end:
```bash
#!/bin/bash
# ... (existing backup code) ...

# NEW: Sync the backup folder to your Cloud Storage
rclone sync $BACKUP_DIR remote_backup:Mkarim_Backups
```
*Now, every night at 2:00 AM, your VPS will create a backup and immediately upload it to your Cloud Drive.*

---

## **5. Hostinger's Built-in Safety**

Don't forget that Hostinger provides a safety net:
1. Log in to your **Hostinger hPanel**.
2. Go to **VPS -> Backups & Snapshots**.
3. **Enable Daily Backups** if you haven't. This is managed by Hostinger and is completely separate from your files.

---

## **6. Emergency Recovery**
# ... (rest of the file remains the same)
