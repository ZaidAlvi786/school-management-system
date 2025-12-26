# HTTPS Setup for Local Development

This guide will help you set up HTTPS for local development so you can test the fingerprint scanner on mobile devices.

## Why HTTPS?

WebAuthn (used for fingerprint scanning) requires a secure context (HTTPS or localhost). When accessing your app from a mobile device via local network IP (like `192.168.1.102`), you need HTTPS for the fingerprint scanner to work.

## Quick Setup

### Step 1: Install mkcert

**macOS:**
```bash
brew install mkcert
```

**Linux:**
```bash
# Ubuntu/Debian
sudo apt install libnss3-tools
# Then download from https://github.com/FiloSottile/mkcert/releases

# Or use the installation script
curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
chmod +x mkcert-v*-linux-amd64
sudo cp mkcert-v*-linux-amd64 /usr/local/bin/mkcert
```

**Windows:**
Download from [mkcert releases](https://github.com/FiloSottile/mkcert/releases) and add to PATH.

### Step 2: Generate SSL Certificates

Run the setup script:
```bash
npm run setup:https
```

This will:
- Install the local certificate authority
- Generate SSL certificates for localhost and your local network IPs
- Create `localhost.pem` and `localhost-key.pem` files

### Step 3: Configure attendance.local Domain

**macOS/Linux:**
1. Find your local network IP:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```

2. Add to `/etc/hosts` file (requires sudo):
   ```bash
   sudo nano /etc/hosts
   ```
   
   Add this line (replace with your actual IP):
   ```
   192.168.1.102 attendance.local
   ```

**Windows:**
1. Find your local network IP:
   ```bash
   ipconfig
   ```
   Look for "IPv4 Address" under your active network adapter.

2. Edit hosts file:
   - Open Notepad as Administrator
   - Open file: `C:\Windows\System32\drivers\etc\hosts`
   - Add this line (replace with your actual IP):
   ```
   192.168.1.102 attendance.local
   ```

### Step 4: Update .env File (Optional)

If you want to use IP address as fallback, add to `.env`:
```env
LOCAL_NETWORK_IP=192.168.1.102
USE_ATTENDANCE_LOCAL=true
```

**Note:** The QR codes will use `attendance.local` by default, which is better for WebAuthn.

### Step 5: Start the HTTPS Server

```bash
npm run dev:https
```

The server will start on `https://localhost:3000` and will be accessible from mobile devices at `https://YOUR_LOCAL_IP:3000`.

### Step 6: Configure Mobile Device

**On your mobile device (same Wi-Fi network):**

1. **Configure hosts file** (if possible) OR use IP address directly:
   - **Option A (Recommended):** Use `attendance.local` - configure hosts file on mobile (may require root/jailbreak)
   - **Option B (Easier):** Access via IP: `https://YOUR_IP:3000` (QR codes will still use attendance.local)

2. Open a browser on your mobile device
3. Navigate to `https://attendance.local:3000` (or `https://YOUR_IP:3000` if hosts not configured)
4. You may see a security warning - click "Advanced" and "Proceed anyway" (this is safe because we're using a local certificate)
5. Scan the QR code - the fingerprint scanner should now work!

**Note:** QR codes will contain `https://attendance.local:3000/attendance/mark?studentId=...` URLs. If your mobile device can't resolve `attendance.local`, you can manually edit the URL to use the IP address, or configure the hosts file on your mobile device.

## Troubleshooting

### Certificate Warning on Mobile

When you first access the HTTPS URL on your mobile device, you'll see a security warning. This is normal for local development certificates. Click "Advanced" → "Proceed anyway" or "Continue to site".

### Fingerprint Scanner Still Not Working

1. Make sure you're accessing via HTTPS (not HTTP)
2. Check that the URL starts with `https://`
3. Verify your device supports biometric authentication
4. Try clearing browser cache and cookies

### Port Already in Use

If port 3000 is already in use, you can change it:
```bash
PORT=3001 npm run dev:https
```

Then update your `.env`:
```env
LOCAL_NETWORK_IP=192.168.1.102
```

And access via `https://YOUR_LOCAL_IP:3001`.

## Production

For production deployment, use a proper SSL certificate (Let's Encrypt, Cloudflare, etc.). This setup is only for local development.

