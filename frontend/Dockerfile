# ============================================================================
# Stage 1 — build the static bundle
# ============================================================================
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
# Use `npm ci` for reproducible builds — requires package-lock.json (committed).
# If the lockfile gets out of sync (you added a dep without running npm install),
# fall back to `npm install` until you regenerate the lockfile.
RUN npm ci --no-audit --no-fund

COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src
RUN npm run build

# ============================================================================
# Stage 2 — serve via nginx
# ============================================================================
FROM nginx:alpine

# SPA fallback: any unknown path → /index.html (so React Router etc. work)
RUN printf '%s\n' \
    'server {' \
    '    listen 80;' \
    '    root /usr/share/nginx/html;' \
    '    index index.html;' \
    '    location / {' \
    '        try_files $uri $uri/ /index.html;' \
    '    }' \
    '}' \
    > /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
