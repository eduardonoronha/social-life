# Social Life MVP

MVP inicial da plataforma "Minha Vida": uma ferramenta para registrar, compreender e compartilhar a própria vida sem competir pelo tempo do usuário.

## Princípios desta versão

- Sem anúncios.
- Sem seguidores.
- Relações são mútuas.
- Sem feed infinito.
- Sem gamificação.
- Limite padrão de 1 hora por dia e 6 horas por semana.
- O usuário pode reduzir seus próprios limites.
- Assinatura futura não deve aumentar o limite.
- O backend é a autoridade para o controle de tempo.
- Diário é o núcleo.
- IA fica preparada arquiteturalmente, mas não é ativada nesta primeira fatia.

## Stack

Backend:
- Python 3.13
- FastAPI
- SQLAlchemy 2 async
- PostgreSQL
- JWT
- pytest

Frontend:
- Next.js
- React
- TypeScript

Infra:
- Docker Compose

## Executar

> Correção incluída na versão 0.1.1: a API configura CORS para aceitar as requisições do Next.js em `localhost:3000`, inclusive o preflight `OPTIONS`.


```bash
docker compose up --build
```

Abra:
- http://localhost:3000
- http://localhost:8000/docs
- http://localhost:8000/health

## Testes

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
pytest
```

## Próximas evoluções

- Alembic para migrations
- refresh tokens
- recuperação de conta
- rate limiting distribuído
- auditoria de acesso
- permissões granulares para IA
- objetivos, hábitos e atividades estruturadas
- mensagens privadas
- memória compartilhada
- IA de registro, recuperação e reflexão
- app mobile
