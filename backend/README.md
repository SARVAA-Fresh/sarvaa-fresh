# SARVAA Fresh API

Hyperlocal commerce backend built with NestJS, Prisma, PostgreSQL, and Redis.

## Tech Stack

- **Framework**: NestJS 10+ with TypeScript
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Cache**: Redis
- **Authentication**: JWT with Passport
- **API Documentation**: Swagger/OpenAPI

## Prerequisites

- Node.js >= 20
- PostgreSQL 14+
- Redis 6+
- Docker & Docker Compose (optional)

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your database credentials and secrets
```

### 3. Setup Database

```bash
# Generate Prisma Client
npx prisma generate

# Run Migrations
npx prisma migrate dev

# (Optional) Seed Database
npx prisma db seed
```

### 4. Start Development Server

```bash
npm run start:dev
```

The API will be available at `http://localhost:3001/api/v1`

### 5. API Documentation

Swagger documentation is available at `http://localhost:3001/api/docs`

## Docker

### Build and Run

```bash
# Build image
docker build -t sarvaa-backend:latest .

# Run container
docker run -p 3001:3001 \
  --env-file .env \
  --name sarvaa-api \
  sarvaa-backend:latest
```

### Using Docker Compose

```bash
# Start all services (postgres, redis, api)
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run start:dev` | Start with hot reload |
| `npm run start:debug` | Start in debug mode |
| `npm run lint` | Run ESLint |
| `npm run test` | Run unit tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:cov` | Generate coverage report |

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | User login |
| GET | `/api/v1/auth/me` | Get current user |

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users/me` | Get current user profile |
| GET | `/api/v1/users/:id` | Get user by ID |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/health` | Full health check |
| GET | `/api/v1/health/live` | Liveness probe |
| GET | `/api/v1/health/ready` | Readiness probe |

## Project Structure

```
backend/
├── prisma/
│   └── schema.prisma      # Database schema
├── src/
│   ├── auth/              # Authentication module
│   ├── users/             # Users module
│   ├── health/            # Health checks
│   ├── prisma/            # Prisma service
│   ├── config/            # Configuration
│   └── common/            # Shared utilities
│       ├── decorators/
│       ├── filters/
│       ├── guards/
│       └── interceptors/
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

## License

Private - All rights reserved