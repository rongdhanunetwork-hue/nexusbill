#!/bin/bash
set -e

echo "======================================"
echo "    ISP Billing Software VPS Setup    "
echo "======================================"

# 1. Update and install prerequisites
echo "[1/7] Updating system and installing prerequisites..."
apt update && apt upgrade -y
apt install -y curl unzip postgresql postgresql-contrib nginx

# 2. Install Node.js (v20)
if ! command -v node &> /dev/null; then
    echo "[2/7] Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    echo "[2/7] Node.js is already installed."
fi

# 3. Install PM2
if ! command -v pm2 &> /dev/null; then
    echo "[3/7] Installing PM2..."
    npm install -g pm2
else
    echo "[3/7] PM2 is already installed."
fi

# 4. Setup PostgreSQL Database
echo "[4/7] Setting up PostgreSQL..."
DB_PASS="NexusBillDB2026"
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD '$DB_PASS';"
sudo -u postgres psql -c "CREATE DATABASE nexusbill;" || echo "Database nexusbill already exists."

# Update the .env file with the actual password
sed -i "s/YOUR_PASSWORD/$DB_PASS/g" .env

# 5. Build and deploy project
echo "[5/7] Installing dependencies and building project..."
npm install
npm run db:push
npm run build

# 6. Data Migration
echo "[6/7] Running data migration..."
npm run import-users || echo "Data migration finished or failed. Check logs."

# 7. Start PM2 and Nginx
echo "[7/7] Configuring Nginx and PM2..."
pm2 start npm --name "nexusbill" -- run start
pm2 save
pm2 startup | tail -n 1 | bash || true

cat > /etc/nginx/sites-available/default << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
systemctl restart nginx

echo "======================================"
echo "    Setup Complete! Application is running on Port 80."
echo "======================================"
