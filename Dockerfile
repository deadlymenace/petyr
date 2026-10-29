FROM oven/bun:1 AS base
WORKDIR /app

# Install Playwright's browsers outside root's home. The server runs as petyr,
# so the default (~/.cache/ms-playwright) would point at an empty
# /home/petyr/.cache, and /root isn't readable by petyr. Set before
# `bun install`, whose postinstall downloads Chromium too. The browser files
# are world-readable, so they need no chown.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Install dependencies
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Install Playwright Chromium (needed for PDF rendering)
RUN bunx playwright install --with-deps chromium

# Copy application source (see .dockerignore for exclusions)
COPY . .

# Create non-root user for runtime security. The container starts as root
# only so the entrypoint can hand a root-owned volume (PETYR_DATA_DIR) to
# petyr; the server itself always runs as petyr.
RUN useradd --no-log-init --create-home --shell /bin/sh petyr && \
    chown -R petyr:petyr /app && \
    chmod +x /app/scripts/docker-entrypoint.sh

# Runtime configuration
# NODE_ENV=production disables Bun's dev error overlay, which would leak
# stack traces and source snippets to clients on unhandled errors.
ENV NODE_ENV=production
ENV PETYR_WEB_PORT=3000
EXPOSE 3000

ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
CMD ["bun", "run", "web"]
