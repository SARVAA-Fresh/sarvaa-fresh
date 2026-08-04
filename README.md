# SARVAA Fresh

## Production Deployment

### Prerequisites

- Docker Engine 24 or newer
- Docker Compose v2.20 or newer
- A production-ready `.env.production` file created from `.env.production.example`

### Environment Setup

Create the production environment file:

```sh
cp .env.production.example .env.production
```

For local production testing, the defaults expose the frontend on `http://localhost:3000` and the backend API on `http://localhost:3001/api/v1`.

Before deploying publicly, replace these values in `.env.production`:

- `POSTGRES_PASSWORD`
- `DATABASE_URL` password segment
- `JWT_SECRET`
- `FRONTEND_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_API_BASE_URL`

Keep Docker-internal service names for database and Redis connectivity:

```env
DATABASE_URL=postgresql://sarvaa:<password>@postgres:5432/sarvaa_fresh?schema=public
REDIS_URL=redis://redis:6379
```

### Start Production Stack

```sh
docker compose -f infrastructure/docker-compose.production.yml --env-file .env.production up --build
```

This starts:

- `frontend`
- `backend`
- `postgres`
- `redis`

The backend automatically runs Prisma production migrations with `prisma migrate deploy` before starting the API. It does not run development migrations or seed data.

### Stop

```sh
docker compose -f infrastructure/docker-compose.production.yml --env-file .env.production down
```

### Rebuild

```sh
docker compose -f infrastructure/docker-compose.production.yml --env-file .env.production build --no-cache
docker compose -f infrastructure/docker-compose.production.yml --env-file .env.production up
```

### Remove Volumes

This removes persisted Postgres, Redis, and upload data:

```sh
docker compose -f infrastructure/docker-compose.production.yml --env-file .env.production down --volumes
```

### Reset Production Database

To reset a local production-test database, stop the stack and remove volumes:

```sh
docker compose -f infrastructure/docker-compose.production.yml --env-file .env.production down --volumes
docker compose -f infrastructure/docker-compose.production.yml --env-file .env.production up --build
```

Do not run this against a live production database unless the data loss is intentional.

