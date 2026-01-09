# Deployment Guide

This guide covers deploying the Pharmacy Inventory Management System to various platforms.

## Prerequisites

- Your code is pushed to GitHub
- GitHub account
- Account on your chosen deployment platform

---

## Option 1: Render (Recommended for SQLite)

Render is recommended because it supports persistent disk storage for SQLite databases.

### Steps:

1. **Sign up/Login to Render**
   - Go to [render.com](https://render.com)
   - Sign up with your GitHub account

2. **Create a New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select your repository: `pharmacy-inventory-management`

3. **Configure Settings**
   - **Name**: `pharmacy-inventory-management` (or your preferred name)
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Root Directory**: (leave empty)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

4. **Environment Variables**
   Click "Advanced" and add:
   ```
   NODE_ENV=production
   SESSION_SECRET=<generate a random secret key>
   ```

   To generate a secret key, you can use:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

5. **Add Persistent Disk** (Important for SQLite)
   - Go to "Disks" tab in your service settings
   - Click "Link Persistent Disk"
   - Create a new disk (1GB should be enough)
   - Mount path: `/opt/render/project/src`
   - This ensures your database persists between deployments

6. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (usually 2-3 minutes)
   - Your app will be live at: `https://pharmacy-inventory-management.onrender.com`

### Important Notes for Render:
- Free tier has limitations (spins down after 15 minutes of inactivity)
- First request after inactivity may take ~30 seconds to wake up
- Consider upgrading to paid plan for production

---

## Option 2: Railway

Railway is another great option with automatic deployments.

### Steps:

1. **Sign up to Railway**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Configure**
   - Railway auto-detects Node.js projects
   - It will automatically install dependencies and start your app

4. **Add Environment Variables**
   - Go to "Variables" tab
   - Add:
     ```
     NODE_ENV=production
     SESSION_SECRET=<your-secret-key>
     PORT=3000
     ```

5. **Add Volume for SQLite** (Important)
   - Go to "Settings" → "Volumes"
   - Create a new volume
   - Mount to: `/app`
   - This keeps your database persistent

6. **Get Your URL**
   - Railway automatically provides a URL
   - Go to "Settings" → "Domains" to add a custom domain

---

## Option 3: Vercel

**Note**: Vercel has limitations with SQLite as it uses serverless functions. Database might reset on each deployment. Consider using a cloud database instead.

### Steps:

1. **Install Vercel CLI** (optional)
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub
   - Click "New Project"
   - Import your repository
   - Vercel will auto-detect the configuration from `vercel.json`
   - Click "Deploy"

3. **Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add:
     ```
     NODE_ENV=production
     SESSION_SECRET=<your-secret-key>
     ```

---

## Option 4: DigitalOcean App Platform

1. **Sign up** at [digitalocean.com](https://digitalocean.com)

2. **Create App**
   - Go to "Apps" → "Create App"
   - Connect GitHub repository

3. **Configure**
   - Select your repository and branch
   - Build command: `npm install`
   - Run command: `npm start`

4. **Add Environment Variables**
   - Add `NODE_ENV=production`
   - Add `SESSION_SECRET=<your-secret-key>`

5. **Add Volume** (for SQLite persistence)
   - In Resources, add a Volume
   - Mount to your app directory

---

## Option 5: Heroku

**Note**: Heroku removed their free tier. You'll need a paid plan.

### Steps:

1. **Install Heroku CLI**
   ```bash
   npm install -g heroku
   ```

2. **Login**
   ```bash
   heroku login
   ```

3. **Create App**
   ```bash
   heroku create pharmacy-inventory-management
   ```

4. **Set Environment Variables**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set SESSION_SECRET=<your-secret-key>
   ```

5. **Deploy**
   ```bash
   git push heroku main
   ```

---

## General Deployment Notes

### Environment Variables
Make sure to set these in your deployment platform:
- `NODE_ENV=production`
- `SESSION_SECRET` (use a strong random string)
- `PORT` (usually auto-set by the platform)

### SQLite Database Considerations
- SQLite works well for small to medium applications
- For production with high traffic, consider migrating to PostgreSQL
- Always use persistent disk/volumes to prevent data loss
- Backup your database regularly

### Security Checklist
- ✅ Change default admin password after first deployment
- ✅ Use strong SESSION_SECRET in production
- ✅ Enable HTTPS (usually automatic on these platforms)
- ✅ Keep dependencies updated

### Post-Deployment
1. Visit your deployed URL
2. Test admin login (default: `admin` / `admin123`)
3. **IMPORTANT**: Change the default admin password immediately
4. Test creating products, orders, etc.

---

## Troubleshooting

### Database not persisting
- Make sure you've added a persistent disk/volume
- Check that the database file path is within the mounted volume

### App crashes on startup
- Check logs in your platform's dashboard
- Ensure all environment variables are set
- Verify `npm install` completes successfully

### Uploads not working
- Ensure the `public/uploads` directory exists
- Check write permissions
- Consider using cloud storage (AWS S3, Cloudinary) for production

---

## Need Help?

Check your platform's documentation or logs for specific errors.

