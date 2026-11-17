BASE_COMPOSE := "docker compose -f docker-compose.yml"
BUILDER := "weather-trends-builder"
IMAGE_NAME := "huffmanks/weather-trends"
VERSION := `node -p "require('./package.json').version"`

# --- Public Recipes ---
default:
    @just --list

# Start dev
dev:
    @test -f .env.development || (echo "Error: .env.development missing!" && exit 1)
    set -a && source .env.development && set +a && pnpm dev

# Start environment (default: staging)
up profile="staging":
    @test -f .env.{{profile}} || (echo "Error: .env.{{profile}} missing!" && exit 1)
    @if [ "{{profile}}" != "staging" ] && [ "{{profile}}" != "production" ]; then \
        echo "Error: Only used for staging or production!" >&2; \
        exit 1; \
    fi
    @echo "Starting {{profile}} environment..."
    set -a && . .env.{{profile}} && set +a && {{BASE_COMPOSE}} up -d --force-recreate

# Stop environment (default: staging)
down profile="staging":
    @echo "Stopping {{profile}} environment..."
    set -a && . .env.{{profile}} && set +a && {{BASE_COMPOSE}} down

# Setup pre-reqs
init:
    @for env in development staging production; do \
        if [ ! -f .env.$env ]; then \
            cp .example.env.$env .env.$env; \
            echo "Created .env.$env"; \
        else \
            echo ".env.$env already exists, skipping..."; \
        fi; \
    done

# Build the docker image
build push="false":
    @echo "Building docker image version {{VERSION}}..."
    @docker buildx ls | grep -q {{BUILDER}} || docker buildx create --name {{BUILDER}} --driver docker-container
    docker buildx inspect --bootstrap
    docker buildx use {{BUILDER}}
    {{ if push == "true" { \
        "docker buildx build --no-cache --platform linux/amd64,linux/arm64 " + \
        "-t " + IMAGE_NAME + ":" + VERSION + " " + \
        "-t " + IMAGE_NAME + ":latest --push ." \
    } else { \
        "docker buildx build --no-cache -t " + IMAGE_NAME + ":local" + " --load ." \
    } }}
    @docker buildx rm {{BUILDER}} || true
    @echo "Build complete."
