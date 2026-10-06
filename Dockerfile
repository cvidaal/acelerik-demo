FROM node:22-alpine AS frontend
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM golang:1.26-alpine AS backend
WORKDIR /src
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 go build -trimpath -o /api ./cmd/api

FROM alpine:3.23
RUN apk add --no-cache ca-certificates tzdata && adduser -D -u 10001 demo
WORKDIR /app
COPY --from=backend /api /app/api
COPY --from=frontend /src/dist /app/public
ENV PORT=8081 STATIC_DIR=/app/public GIN_MODE=release TZ=Europe/Madrid
USER demo
EXPOSE 8081
CMD ["/app/api"]
