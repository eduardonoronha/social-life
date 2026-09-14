# Feature 1 — Controle de tempo robusto

## Regras

- teto diário: 60 minutos;
- teto semanal: 360 minutos;
- limites configuráveis apenas para baixo;
- o backend é a autoridade;
- o frontend não informa duração;
- uma única sessão ativa por usuário;
- PostgreSQL impede sessões concorrentes;
- heartbeat a cada 10 segundos;
- troca de aba encerra a sessão;
- retorno à aba inicia uma nova sessão;
- sessão possui `hard_stop_at`;
- `hard_stop_at` nunca ultrapassa:
  - limite restante diário;
  - limite restante semanal;
  - meia-noite no fuso do usuário;
  - início da próxima semana no fuso do usuário;
- endpoints que consomem tempo exigem sessão ativa;
- chamada direta à API sem sessão recebe HTTP 403.

## Por que isso é melhor que o MVP anterior

O cliente não pode fazer:

```text
POST /usage/stop
duration=0
```

ou:

```text
POST /life/entries
```

sem antes possuir uma sessão válida.

O tempo é derivado de:

```text
started_at
hard_stop_at
ended_at
```

e nunca de um contador enviado pelo navegador.

## Observação

O frontend pode parar de enviar heartbeat, fechar o navegador ou tentar manipular JavaScript. Isso não altera o tempo já registrado pelo servidor. No retorno, o servidor reconcilia a sessão.

Para produção, a próxima etapa de endurecimento deve incluir Alembic obrigatório, testes de concorrência no PostgreSQL, CSRF para autenticação por cookie caso esse modelo seja adotado, rate limiting e observabilidade.
