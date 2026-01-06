# =============================================================================
# Makefile - AI Docs Docker Commands
# =============================================================================

.PHONY: help build up down logs shell db-shell clean rebuild

# Colores
CYAN := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RESET := \033[0m

help: ## Muestra esta ayuda
	@echo ""
	@echo "$(CYAN)AI Docs - Comandos Docker$(RESET)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-15s$(RESET) %s\n", $$1, $$2}'
	@echo ""

build: ## Construye las imágenes de Docker
	docker compose build

up: ## Inicia todos los servicios
	docker compose up -d
	@echo ""
	@echo "$(GREEN)✅ AI Docs iniciado en http://localhost:4321$(RESET)"
	@echo ""

down: ## Detiene todos los servicios
	docker compose down

logs: ## Muestra logs de la aplicación
	docker compose logs -f app

logs-db: ## Muestra logs de PostgreSQL
	docker compose logs -f postgres

shell: ## Abre shell en el contenedor de la app
	docker compose exec app sh

db-shell: ## Abre psql en PostgreSQL
	docker compose exec postgres psql -U aidocs -d ai_docs

clean: ## Limpia contenedores, imágenes y volúmenes
	docker compose down -v --rmi local
	@echo "$(YELLOW)⚠️  Volúmenes eliminados - los datos de la BD se perdieron$(RESET)"

rebuild: down build up ## Reconstruye y reinicia todo

status: ## Muestra estado de los contenedores
	docker compose ps

migrate: ## Ejecuta migraciones manualmente
	docker compose exec app npx drizzle-kit migrate
