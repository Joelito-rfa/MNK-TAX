# ============================================================
# MNK-TAX — Image unique pour Render (nginx + backend Spring)
# Build : contexte = racine du dépôt (dockerContext = .)
# ============================================================
# syntax=docker/dockerfile:1

### Étape 1 — Build backend Java ###
FROM maven:3.9-eclipse-temurin-17 AS backend-build
WORKDIR /build/backend
COPY backend/pom.xml ./
RUN mvn -B dependency:go-offline
COPY backend/src ./src
RUN mvn -B package -DskipTests

### Étape 2 — Build frontend React ###
FROM node:24-alpine AS frontend-build
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/public ./public
COPY frontend/src ./src
COPY frontend/index.html frontend/tsconfig.json frontend/tsconfig.app.json frontend/tsconfig.node.json frontend/tsconfig.test.json frontend/vite.config.ts frontend/vitest.config.ts frontend/.oxlintrc.json ./
RUN npm run build

### Étape 3 — Image finale : JRE 17 + nginx ###
FROM eclipse-temurin:17-jre-jammy
ENV JAVA_OPTS="-Xms64m -Xmx384m -XX:MaxMetaspaceSize=160m -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -Dfile.encoding=UTF-8"

RUN apt-get update \
    && apt-get install -y --no-install-recommends nginx gettext-base curl \
    && rm -rf /var/lib/apt/lists/* \
    && rm -f /etc/nginx/sites-enabled/default \
    && ln -sf /dev/stdout /var/log/nginx/access.log \
    && ln -sf /dev/stderr /var/log/nginx/error.log

RUN useradd -r -s /bin/false appuser \
    && mkdir -p /app/data/receipts /app/data/documents /app/data/avatars \
    && chown -R appuser:appuser /app

COPY --from=backend-build /build/backend/target/mnk-tax.jar /app/app.jar
COPY --from=frontend-build /build/frontend/dist /usr/share/nginx/html
COPY deploy/render/nginx.template /etc/nginx/conf.d/mnk-tax.template
COPY deploy/render/start.sh /app/start.sh

RUN chmod +x /app/start.sh

WORKDIR /app
EXPOSE 8080
CMD ["/app/start.sh"]