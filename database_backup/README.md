# VARTA Database Backup & Restore Guide

This directory contains the production-ready snapshot of the VARTA database (`varta_db`).

## File Overview
- `varta_backup.sql`: Complete PostgreSQL database dump (including all users, posts, media references, comments, hashtags, communities, and configurations).

---

## How to Restore the Database

### Method 1: Using Docker (Standard Local Dev Setup)
Ensure your PostgreSQL docker container is running:
```bash
docker compose up -d postgres
```

Restore the backup file into the running PostgreSQL container:
```bash
# Windows Command Prompt / PowerShell:
cmd /c "docker exec -i varta-dev-postgres psql -U varta_user -d varta_db < database_backup\varta_backup.sql"

# Linux / macOS / Git Bash:
docker exec -i varta-dev-postgres psql -U varta_user -d varta_db < database_backup/varta_backup.sql
```

After restoring, generate the Prisma client to ensure sync:
```bash
npm run db:generate
```

---

### Method 2: Using npm script
From the project root:
```bash
npm run db:restore
```

---

### Method 3: In Production Docker Deployment (Automatic or Manual)
1. **Automatic on First Launch**:
   `docker/docker-compose.prod.yml` automatically mounts `database_backup/varta_backup.sql` into `/docker-entrypoint-initdb.d/01-init.sql:ro`. On a fresh deployment server, the database initializes with all existing data automatically.

2. **Manual Restore into Running Production Container**:
   ```bash
   docker exec -i varta-prod-postgres psql -U varta_user -d varta_db < database_backup/varta_backup.sql
   ```

---

### Method 4: Cloud Managed Database (Supabase, Neon, AWS RDS, Railway, Render)
If your production database is hosted on a cloud provider, restore directly using your `DATABASE_URL`:
```bash
# Direct psql connection string:
psql "<YOUR_PRODUCTION_DATABASE_URL>" < database_backup/varta_backup.sql
```

---

## How to Take a New Backup
To create a fresh backup at any time from your running database:
```bash
npm run db:backup
```
Or directly via docker:
```bash
cmd /c "docker exec -i varta-dev-postgres pg_dump -U varta_user -d varta_db --clean --if-exists > database_backup\varta_backup.sql"
```
