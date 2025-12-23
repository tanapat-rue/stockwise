# syntax=docker/dockerfile:1

FROM golang:1.23 AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o stockflows .

FROM gcr.io/distroless/base-debian12:nonroot

WORKDIR /app

COPY --from=builder /app/stockflows ./stockflows

ENV STOCKFLOWS_CONFIG=/app/config.json
EXPOSE 8080

USER nonroot:nonroot

ENTRYPOINT ["/app/stockflows"]

