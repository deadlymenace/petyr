FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Install Playwright Chromium (needed for PDF rendering)
RUN bunx playwright install --with-deps chromium

# Copy application source
COPY . .

# Runtime configuration
ENV PETYR_WEB_PORT=3000
EXPOSE 3000

CMD ["bun", "run", "web"]
