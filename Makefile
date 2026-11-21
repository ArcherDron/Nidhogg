.PHONY: api web test lint build

api:
	go -C api run ./cmd/server

web:
	npm --prefix web run dev

test:
	go -C api test ./...

lint:
	npm --prefix web run lint

build:
	go -C api build ./cmd/server
	npm --prefix web run build
