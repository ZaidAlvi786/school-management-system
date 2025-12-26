# MongoDB Setup Guide

This guide will help you set up MongoDB for the School Management System. You can use either **MongoDB Atlas** (cloud) or **Local MongoDB**. Both options work with TablePlus!

## Option 1: MongoDB Atlas (Cloud - Recommended for Production)

MongoDB Atlas is a cloud-hosted MongoDB service. It's free to start and perfect for development and production.

### Step 1: Create MongoDB Atlas Account

1. Go to [https://www.mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register)
2. Sign up for a free account (or sign in if you already have one)
3. Verify your email address

### Step 2: Create a Cluster

1. After logging in, click **"Build a Database"** or **"Create"**
2. Choose the **FREE** tier (M0 Sandbox)
3. Select a cloud provider and region (choose the one closest to you)
4. Click **"Create"** (cluster name is optional)
5. Wait 3-5 minutes for the cluster to be created

### Step 3: Create Database User

1. In the **Security** section, click **"Database Access"**
2. Click **"Add New Database User"**
3. Choose **"Password"** authentication
4. Enter a username (e.g., `schooladmin`)
5. Enter a strong password (save this securely!)
6. Under **"Database User Privileges"**, select **"Atlas admin"** or **"Read and write to any database"**
7. Click **"Add User"**

### Step 4: Configure Network Access

1. In the **Security** section, click **"Network Access"**
2. Click **"Add IP Address"**
3. For development, click **"Allow Access from Anywhere"** (adds `0.0.0.0/0`)
   - ⚠️ For production, add only specific IPs for better security
4. Click **"Confirm"**

### Step 5: Get Connection String

1. Click **"Connect"** button on your cluster
2. Choose **"Connect your application"**
3. Select **"Node.js"** as the driver and version **5.5 or later**
4. Copy the connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/`)
5. Replace `<password>` with your database user password
6. Add your database name at the end: `/school_management`

**Final connection string format:**
```
mongodb+srv://schooladmin:yourpassword@cluster0.xxxxx.mongodb.net/school_management?retryWrites=true&w=majority
```

### Step 6: Add to .env File

1. Create `.env` file in the root directory:
   ```bash
   touch .env
   ```

2. Open `.env` and add all required variables:
   ```env
   # MongoDB (from Step 5)
   MONGODB_URI=mongodb+srv://schooladmin:yourpassword@cluster0.xxxxx.mongodb.net/school_management?retryWrites=true&w=majority
   
   # NextAuth (required even for local dev - use simple value)
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=local-dev-secret-key-12345
   
   # JWT (required even for local dev - use simple value)
   JWT_SECRET=local-jwt-secret-12345
   
   # OpenRouter AI (get from https://openrouter.ai)
   OPENROUTER_API_KEY=your-openrouter-api-key
   OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
   ```

   **Note:** For local development, you can use simple values for `NEXTAUTH_SECRET` and `JWT_SECRET`. Generate secure random strings only for production.

---

## Option 2: Local MongoDB (For Development)

If you prefer to run MongoDB locally on your machine.

### macOS Installation

1. **Using Homebrew** (recommended):
   ```bash
   brew tap mongodb/brew
   brew install mongodb-community
   ```

2. **Start MongoDB service**:
   ```bash
   brew services start mongodb-community
   ```

3. **Verify it's running**:
   ```bash
   mongosh
   ```
   If you see the MongoDB shell, it's working! Type `exit` to leave.

### Windows Installation

1. Download MongoDB Community Server from [https://www.mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
2. Run the installer and follow the setup wizard
3. MongoDB will start automatically as a Windows service

### Linux Installation

1. Follow the official guide: [https://www.mongodb.com/docs/manual/installation/](https://www.mongodb.com/docs/manual/installation/)

### Connection String for Local MongoDB

Update your `.env` file:
```env
MONGODB_URI=mongodb://localhost:27017/school_management
```

---

## Using TablePlus with MongoDB

**Yes, you can absolutely use TablePlus!** TablePlus has excellent MongoDB support.

### Step 1: Install TablePlus

1. Download TablePlus from [https://tableplus.com/](https://tableplus.com/)
2. Install it on your Mac/Windows/Linux

### Step 2: Connect to MongoDB Atlas

1. Open TablePlus
2. Click **"Create a new connection"** (or press `Cmd/Ctrl + N`)
3. Select **"MongoDB"** from the database types
4. Fill in the connection details:
   - **Name**: `School Management (Atlas)`
   - **Host**: Your cluster hostname (e.g., `cluster0.xxxxx.mongodb.net`)
   - **Port**: `27017` (or leave default)
   - **User**: Your database username
   - **Password**: Your database password
   - **Database**: `school_management`
   - **Use SSL**: ✅ Check this box (required for Atlas)
5. Click **"Test"** to verify the connection
6. Click **"Connect"**

### Step 3: Connect to Local MongoDB

1. Open TablePlus
2. Click **"Create a new connection"**
3. Select **"MongoDB"**
4. Fill in:
   - **Name**: `School Management (Local)`
   - **Host**: `localhost`
   - **Port**: `27017`
   - **Database**: `school_management`
   - **Use SSL**: ❌ Uncheck (not needed for local)
5. Click **"Connect"**

### TablePlus Features for MongoDB

- ✅ Browse collections (tables)
- ✅ View documents (rows)
- ✅ Edit documents directly
- ✅ Run MongoDB queries
- ✅ Export/Import data
- ✅ Visual query builder
- ✅ Database structure viewer

---

## Verify Your Setup

### Test MongoDB Connection

1. Make sure your `.env` file has the correct `MONGODB_URI`
2. Run the seed script to populate the database:
   ```bash
   npm run seed
   ```
3. If successful, you should see:
   ```
   ✅ Database seeded successfully!
   ```

### Check in TablePlus

1. Open TablePlus
2. Connect to your MongoDB instance
3. You should see the `school_management` database
4. Expand it to see collections like:
   - `users`
   - `schools`
   - `students`
   - `teachers`
   - `grades`
   - etc.

---

## Troubleshooting

### Connection Issues with Atlas

- **"IP not whitelisted"**: Add your IP address in Network Access settings
- **"Authentication failed"**: Check username and password in connection string
- **"Connection timeout"**: Check your internet connection and firewall settings

### Connection Issues with Local MongoDB

- **"Connection refused"**: Make sure MongoDB service is running
  - macOS: `brew services list` to check status
  - Windows: Check Services app for MongoDB
- **"Port 27017 in use"**: Another MongoDB instance might be running

### TablePlus Connection Issues

- **SSL errors**: Make sure "Use SSL" is checked for Atlas, unchecked for local
- **Can't see database**: The database will be created automatically when you run the seed script
- **Authentication errors**: Double-check username and password

---

## Security Best Practices

1. **Never commit `.env` file** to Git (it's already in `.gitignore`)
2. **Use strong passwords** for database users
3. **Restrict IP access** in production (don't use `0.0.0.0/0`)
4. **Rotate passwords** regularly
5. **Use environment-specific databases** (dev, staging, production)

---

## Next Steps

After setting up MongoDB:

1. ✅ Copy `.env.example` to `.env`
2. ✅ Add your `MONGODB_URI` to `.env`
3. ✅ Run `npm run seed` to populate the database
4. ✅ Connect TablePlus to view your data
5. ✅ Run `npm run dev` to start the application

---

## Quick Reference

### MongoDB Atlas Connection String Format
```
mongodb+srv://username:password@cluster.mongodb.net/database_name?retryWrites=true&w=majority
```

### Local MongoDB Connection String Format
```
mongodb://localhost:27017/database_name
```

### TablePlus Connection Settings
- **Atlas**: Use SSL ✅, Port 27017, Host from connection string
- **Local**: Use SSL ❌, Port 27017, Host localhost

---

**Need Help?** Check the main README.md or open an issue on GitHub.

