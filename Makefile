.PHONY: up down logs test

up:
	docker-compose --env-file .env up mocks app -d --build 

down:
	docker-compose down

logs:
	docker-compose logs -f

test:
	docker-compose --env-file .env up tests-all --build