.PHONY: up down logs

up:
	docker-compose --env-file .env up -d --build

down:
	docker-compose down

logs:
	docker-compose logs -f
