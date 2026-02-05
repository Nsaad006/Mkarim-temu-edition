# 🐳 Complete Docker Setup Guide for Hostinger VPS

This guide focuses specifically on installing and verifying Docker and Docker Compose on your Ubuntu VPS.

---

## **Task 1: Log in to VPS**
1.  Open your terminal (PowerShell, CMD, or VS Code Terminal).
2.  SSH into your server:
    ```bash
    ssh root@<YOUR_VPS_IP>
    ```
    *(Enter your password when prompted).*

---

## **Task 2: Uninstall Old Versions (Clean Slate)**
Ensure no conflicting old versions exist.
```bash
sudo apt-get remove docker docker-engine docker.io containerd runc
```

---

## **Task 3: Install Docker Engine**

1.  **Update the apt package index:**
    ```bash
    sudo apt-get update
    sudo apt-get install ca-certificates curl gnupg
    ```

2.  **Add Docker’s official GPG key:**
    ```bash
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    ```

3.  **Set up the repository:**
    ```bash
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    ```

4.  **Install Docker Engine, containerd, and Docker Compose:**
    ```bash
    sudo apt-get update
    sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    ```

---

## **Task 4: Install Standalone Docker Compose (Optional but Recommended)**
While the plugin works (`docker compose`), having the standalone binary (`docker-compose`) is often easier for compatibility with older scripts.

1.  **Download the latest version:**
    ```bash
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    ```

2.  **Apply executable permissions:**
    ```bash
    sudo chmod +x /usr/local/bin/docker-compose
    ```

3.  **Verify installation:**
    ```bash
    docker-compose --version
    ```
    *Output should look like: `Docker Compose version v2.24.5`*

---

## **Task 5: Start and Enable Docker**
Make sure Docker starts automatically if the server reboots.

```bash
sudo systemctl start docker
sudo systemctl enable docker
```

---

## **Task 6: Verify Everything Works**
Run the "Hello World" container to test permissions and installation.

```bash
sudo docker run hello-world
```

**Success Message:**
You should see:
> "Hello from Docker!
> This message shows that your installation appears to be working correctly."

---

## **What's Next?**
Now that Docker is ready, proceed to **Step 2 (Clone Project)** in the `HOSTINGER_DEPLOYMENT_GUIDE.md` file to deploy your app!
