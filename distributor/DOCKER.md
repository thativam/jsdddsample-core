# Running the distributed app in Docker

## Prerequisites

- Docker Desktop running
- Observability stack and infra already started (see below)

## One-time setup

Create the shared Docker network (only needed once):

```bash
docker network create dddsample
```

## Start infrastructure (MongoDB + RabbitMQ)

```bash
docker compose -f ../docker-compose.infra.yml up -d
```

RabbitMQ management UI: http://localhost:15672 (guest / guest)

## Start observability (Prometheus + Grafana + cAdvisor)

```bash
docker compose -f ../docker-compose.observability.yml up -d
```

Grafana: http://localhost:8081 (admin / admin)  
Prometheus: http://localhost:9090  
cAdvisor: http://localhost:8082

## Build and run the distributed app

```bash
# 1. Generate the distributed servers
npm run dist          # 3 servers (alpha, beta, gamma)
# or
npm run sv4           # 4 servers (alpha, beta, gamma, theta)

# 2. Patch the generated compose.yaml and Prometheus targets for Docker
npm run inject:metrics:docker

# 3. Build images and start containers
npm run start:dist:docker
```

## Stop containers

```bash
# Find the compose.yaml path printed by start:dist:docker, then:
docker compose -f dist/distributedValid/compose.yaml down
# or for sv4:
docker compose -f dist/sv4/compose.yaml down
```

## Host mode (no Docker for the app)

Use the standard scripts — apps run directly on localhost and reach MongoDB/RabbitMQ
via the published ports (27017, 5672):

```bash
npm run inject:metrics   # installs deps + patches start.js
npm run start:dist       # spawns all servers in the terminal
```

## What inject:metrics:docker does differently from inject:metrics

| Step | Host mode | Docker mode |
|------|-----------|-------------|
| Patch `start.js` | Yes | No (Dockerfile handles it) |
| `npm install` in each server | Yes | No (Dockerfile handles it) |
| Prometheus targets | `host.docker.internal:<port>` | `<service-name>:<port>` |
| Patch `compose.yaml` | No | Yes — adds network, `env_file: .env.docker`, port 8080 on alpha |

The `.env.docker` file (at `utils/.env.docker`) points `MONGODB_URI` to `mongodb://mongodb`
and `RABBITMQ_URL` to `amqp://rabbit`, matching the service names in `docker-compose.infra.yml`.
