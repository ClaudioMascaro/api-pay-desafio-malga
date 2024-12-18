.PHONY: up down migrate logs

up:
	docker-compose --env-file .env up -d --build

down:
	docker-compose down

migrate:
	docker-compose --env-file .env run app npm run migration:run

logs:
	docker-compose logs -f
