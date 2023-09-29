FROM node:16
# Create app user
RUN addgroup --system app \
    && adduser --system --group app

# Create app directory
RUN mkdir /app \
    && chown -R app:app /app

WORKDIR /app
# Install app dependencies
COPY package*.json ./
RUN npm install

# Copy app source
COPY --chown=app ./src/ /app/

# Build app
COPY tsconfig.json ./
RUN mkdir build \
    && chown -R app:app /app

USER app
RUN npm run build

# Entrypoint
CMD ["node", "build/index.js"]