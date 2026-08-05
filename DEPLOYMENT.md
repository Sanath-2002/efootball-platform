# Deployment & Production Hosting Guide

This guide provides step-by-step instructions to host and deploy the **eFootball Competition Management Platform** to production cloud platforms.

---

## Architecture Overview
- **Frontend**: React + Vite + TypeScript (Deploy to **Vercel**, **Netlify**, or **Cloudflare Pages**)
- **Backend**: Express + Prisma ORM + TypeScript (Deploy to **Render**, **Railway**, **Fly.io**, or **Koyeb**)
- **Database**: PostgreSQL (**Supabase**, **Neon.tech**, or **Render Postgres**)

---

## Step 1: Deploy Backend & Database (Render / Railway)

### Option A: Using Render + Neon (Recommended)
1. **Database Setup**:
   - Create a free PostgreSQL database on [Neon.tech](https://neon.tech) or [Supabase](https://supabase.com).
   - Copy the PostgreSQL connection string (`DATABASE_URL`).
2. **Deploy Service**:
   - Push your project repository to GitHub.
   - Go to [Render.com](https://render.com) and create a **Web Service**.
   - Set Root Directory: `backend`
   - Set Build Command: `npm install && npm run build`
   - Set Start Command: `npx prisma db push && npm start`
3. **Environment Variables**:
   Add the following environment variables in your Render web service settings:
   - `NODE_ENV`: `production`
   - `PORT`: `5000`
   - `JWT_SECRET`: `your_secure_random_jwt_secret_key`
   - `DATABASE_URL`: `your_postgresql_connection_string`
   - `ALLOWED_ORIGINS`: `https://your-frontend.vercel.app`

---

## Step 2: Deploy Frontend (Vercel)

1. Go to [Vercel.com](https://vercel.com) and import your GitHub repository.
2. Select Root Directory: `frontend`
3. Framework Preset: **Vite**
4. **Environment Variables**:
   - `VITE_API_URL`: `https://your-backend-api.onrender.com/api`
5. Click **Deploy**.

---

## Pre-Deployment Checklist

- [x] Environment variables configured (`JWT_SECRET`, `ALLOWED_ORIGINS`, `VITE_API_URL`)
- [x] CORS origin validation active
- [x] Rate limiting middleware active (`authRateLimiter` & `apiRateLimiter`)
- [x] Unhandled exception handler active
- [x] Both backend and frontend production builds pass cleanly (`npm run build`)
- [x] Database migration push script ready (`npx prisma db push`)
