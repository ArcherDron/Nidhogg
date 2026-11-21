FROM golang:1.24-alpine AS builder

RUN apk add --no-cache build-base
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=1 go build -trimpath -ldflags="-s -w" -o /nidhogg-api ./cmd/server

FROM alpine:3.21
RUN apk add --no-cache ca-certificates && addgroup -S nidhogg && adduser -S nidhogg -G nidhogg
WORKDIR /app
COPY --from=builder /nidhogg-api /usr/local/bin/nidhogg-api
RUN mkdir /data && chown nidhogg:nidhogg /data
USER nidhogg
EXPOSE 8080
CMD ["nidhogg-api"]
