# Diretrizes Técnicas do Projeto

## 1. Objetivo

Este documento define padrões técnicos e de qualidade para o projeto Social Life, com foco em consistência, manutenção e evolução segura. Ele deve funcionar como base para novas solicitações, refinamentos de UI e implementação de features no frontend e no backend.

As regras abaixo devem ser observadas sempre que possível, priorizando clareza e previsibilidade sobre abstrações excessivas.

---

## 2. Princípios gerais

### 2.1 Simplicidade antes da sofisticação
- Soluções simples e previsíveis são preferíveis a arquiteturas complexas sem necessidade real.
- Evitar abstrações prematuras.
- Priorizar legibilidade e facilidade de manutenção.

### 2.2 Clareza de intenção
- O código deve expressar o que faz sem exigir interpretação profunda.
- Nomes devem ser descritivos, curtos e consistentes.
- Comentários devem explicar o porquê, não o óbvio.

### 2.3 Responsabilidade única
- Cada arquivo deve ter uma responsabilidade principal bem definida.
- Funções e componentes devem ter escopo pequeno, objetivo único e fácil de testar.
- Evitar arquivos “mega-blob” com lógica de UI, regras de negócio e chamadas de API misturadas.

### 2.4 Reuso com critério
- Reaproveitar componentes e utilitários quando eles têm propósito claro e estável.
- Não criar abstrações apenas para evitar duplicação de 2 ou 3 linhas.
- Extrair quando a duplicação compromete manutenção ou leitura.

### 2.5 Segurança e privacidade
- O projeto é sensível a dados pessoais e relacionamentos.
- Não expor dados privados em logs, queries de desenvolvimento ou respostas de erro sem necessidade.
- Não usar hardcoded secrets ou dados pessoais em exemplos e testes.

---

## 3. Stack e arquitetura

### 3.1 Frontend
- Next.js + React + TypeScript
- Componentes React funcionais com hooks
- Uso de App Router do Next.js (`app/`)
- Layouts e páginas devem ser simples; a lógica complexa deve migrar para componentes e utilitários

### 3.2 Backend
- Python 3.13+
- FastAPI
- SQLAlchemy 2 async
- Pydantic para validação
- Estrutura modular por domínio: API, core, models, services, schemas

### 3.3 Infraestrutura
- Docker Compose para orquestração
- Ambiente reproduzível e enxuto
- Cada serviço deve ter seu próprio Dockerfile quando necessário

---

## 4. Padrões de nomenclatura

### 4.1 Variáveis e funções

#### TypeScript / React
- `camelCase` para variáveis, funções, props, estados e parâmetros.
- Exemplos:
  - `activeSession`
  - `loadEntries()`
  - `shareAudience`
  - `isGoalModalOpen`

#### Python
- `snake_case` para funções, variáveis e parâmetros.
- Exemplos:
  - `load_profile()`
  - `active_session_id`
  - `share_moment()`

#### Constantes
- `UPPER_SNAKE_CASE` para valores imutáveis e configurações globais.
- Exemplos:
  - `API_BASE_URL`
  - `DEFAULT_PAGE_SIZE`

#### Tipos e interfaces
- `PascalCase` para tipos, interfaces e enums.
- Exemplos:
  - `UserProfile`
  - `ShareAudience`
  - `Section`

### 4.2 Arquivos
- Componentes React: `PascalCase` em arquivos `.tsx` quando forem componentes reais.
  - Exemplo: `ProfileCard.tsx`
- Utilitários: `camelCase` ou `kebab-case` conforme convenção local, mas consistente.
  - Exemplo: `apiClient.ts`, `formatters.ts`
- Arquivos de página/rota: `page.tsx` e `layout.tsx` no App Router
- Arquivos de domínio backend: nomes descritivos e em `snake_case` ou `lowercase` conforme padrão do projeto

### 4.3 Funções e handlers
- Prefixos úteis quando a intenção for clara:
  - `loadX`, `saveX`, `createX`, `updateX`, `deleteX`
  - `handleSubmit`, `handleChange`, `toggleX`
- Evitar nomes genéricos como `doThing`, `processData`, `handle` sem contexto.

---

## 5. Organização de arquivos e pastas

### 5.1 Frontend
Estrutura esperada:

```text
frontend/
  app/
    layout.tsx
    page.tsx
  components/
    ui/
    forms/
    sections/
  lib/
    api.ts
    formatters.ts
  styles/
    globals.css
```

Regras:
- `app/` deve conter apenas roteamento, layout e páginas;
- `components/` deve concentrar blocos reutilizáveis;
- `lib/` deve armazenar utilitários genéricos e integrações;
- `styles/` deve guardar tokens e estilos globais quando houver necessidade;
- evitar manter toda a lógica da interface em `app/page.tsx` quando ela crescer.

### 5.2 Backend
Estrutura esperada:

```text
backend/
  app/
    api/
    core/
    models/
    schemas/
    services/
  tests/
```

Regras:
- `api/`: endpoints e rotas
- `schemas/`: DTOs, validações públicas
- `models/`: entidades de banco
- `services/`: regras de negócio
- `core/`: configurações, segurança, utilidades globais
- `tests/`: testes de comportamento e regressão

### 5.3 Arquivos grandes
- Se um arquivo passar de 250-400 linhas e misturar responsabilidades, quebrar em módulos menores.
- Mantém-se uma página ou rota até onde fizer sentido, mas não como “sujeira centralizada”.
- Sempre priorizar leitura por contexto, com componentes pequenos e nomes explícitos.

---

## 6. Frontend: padrões de componentização

### 6.1 Componentes pequenos e coesos
- Componentes devem ter responsabilidade única.
- Evitar grandes blocos condicionais dentro de um único componente.
- Extrair subcomponentes quando a renderização passa a repetir ou crescer demais.

### 6.2 Props e tipos
- Sempre tipar props com `type` ou `interface`.
- Não usar `any` sem justificativa explícita.
- Quando a propriedade for opcional, deixar explícito no tipo.

### 6.3 State e efeitos
- Estado local deve ser simples e específico ao componente.
- Use `useCallback`/`useMemo` somente quando houver ganho real de performance ou estabilidade de referência.
- Evitar efeitos complexos e múltiplas responsabilidades em um único `useEffect`.

### 6.4 Modal e formulários
- Modais devem ser componentes reutilizáveis e isolados.
- Formulários devem controlar estado com clareza, preferencialmente por `state` local.
- Botões e ações devem ser explícitos: `onSubmit`, `onClose`, `onCancel`.

### 6.5 Estilos
- Prefira estilos explícitos em objetos quando a UI for simples e local, mas sempre com consistência visual.
- Quando o estilo se repetir, extraí-lo para utilitários/constantes compartilhados.
- Evitar CSS inline excessivo em arquivos longos e pouco reutilizáveis.

### 6.6 Validação e UX
- Campos obrigatórios devem ser validados antes do envio.
- Mensagens de erro devem ser amigáveis e orientadas à ação.
- O feedback de carregamento e sucesso deve ser claro.

---

## 7. Backend: padrões de API e domínio

### 7.1 Endpoints bem nomeados
- Usar nomes claros de recurso e ação.
- Exemplo:
  - `/life/entries`
  - `/personal/goals`
  - `/social/moments`
  - `/usage/start`

### 7.2 Schemas e validação
- Definir schemas de entrada/saída para garantir consistência.
- Campos sensíveis devem ser sempre validados.
- Não confiar cegamente em payloads do cliente.

### 7.3 Regras de negócio
- Lógica de domínio deve ficar em services, não disperçada nos endpoints.
- Endpoints devem coordinar chamadas e resposta, não conter regra pesada demais.

### 7.4 Respostas de erro
- Erros devem ser claros, consistentes e com status HTTP apropriado.
- Mensagens devem ser úteis para o cliente e não vazarem detalhes internos desnecessários.

---

## 8. Padrões de dados e estado

### 8.1 Estruturas em frontend
- Dados vindo da API devem ser mapeados em tipos explícitos.
- Evitar objetos aninhados sem tipagem quando houver domínio claro.
- Agrupar estados por domínio, por exemplo: `entries`, `goals`, `habits`, `profile`.

### 8.2 Estado e sincronização
- Atualizar estado local com base em retorno da API após criação/edição/remoção.
- Preferir recarregar dados relevantes em vez de construir estados inconsistentes manualmente.
- Guardar lógica de refresh em utilitários ou callbacks reutilizáveis.

### 8.3 Filtragem e ordenação
- Ordenar por data ou relevância quando houver listagem de itens.
- Filtrar sempre de forma explícita e previsível, usando operações estabelecidas.

---

## 9. Testes e validação

### 9.1 Cobertura mínima
- Testar comportamento real e crítico do sistema.
- Priorizar testes em fluxos de negócios e integrações relevantes.
- Não dependenciar apenas de assertions de mock sem validar comportamento real.

### 9.2 Frontend
- Validar renderização e interações principais.
- Cobrir fluxos de criação, edição e listagem relevantes.
- Testes devem validar o que o usuário percebe, não só o internals do componente.

### 9.3 Backend
- Validar endpoints, autenticação e regras de autorização.
- Cobrir cenários de sucesso e falha.
- Priorizar regressões em regras de negócio.

### 9.4 Verificação antes de concluir
- Sempre validar a alteração com o comando ou fluxo mais adequado.
- Exemplo: build do frontend ou testes do backend antes de fechar tarefa.
- Não concluir sem evidência de que a mudança funciona.

---

## 10. Boas práticas de mercado

### 10.1 Clean code
- Funções pequenas e nomes explícitos.
- Sem duplicação desnecessária.
- Sem lógica escondida em renderização.

### 10.2 Segurança
- Sanitizar entradas do usuário.
- Tratar erros sem expor stack traces para o cliente em produção.
- Respeitar permissões e contexto social do usuário.

### 10.3 Performance
- Evitar re-renders desnecessários.
- Carregar apenas o necessário.
- Reutilizar resultados quando benefício claro.

### 10.4 Manutenção
- Documentar decisões complexas no código ou na documentação do projeto.
- Manter convenções de nomes e estrutura consistentes ao longo do tempo.
- Atualizar documentação sempre que a arquitetura ou o comportamento principal mudar.

---

## 11. Regras de implementação para as próximas solicitações

### 11.1 Antes de escrever código
- Entender o comportamento esperado e o contexto funcional.
- Verificar se a mudança se encaixa no padrão da aplicação.
- Identificar se a solução deve ser frontend, backend, ou ambos.

### 11.2 Durante a implementação
- Usar nomes consistentes com o padrão do projeto.
- Extrair módulos reutilizáveis quando houver lógica repetida.
- Manter o código dentro do escopo do problema.

### 11.3 Antes de finalizar
- Validar com build/test relevante.
- Checar se não houve regressão de UX ou regra de negócio.
- Garantir que o arquivo final esteja legível e organizado.

---

## 12. Checklist de revisão de código

Antes de fechar qualquer mudança, verificar:

- [ ] Nome de variáveis e funções seguem a convenção do projeto
- [ ] Arquivos estão organizados por responsabilidade
- [ ] Componentes/serviços estão reutilizáveis quando necessário
- [ ] Lógica de negócio não ficou espalhada em UI
- [ ] Tipagem está consistente
- [ ] Erros e mensagens de usuário foram tratados
- [ ] Testes ou validação relevante foram executados
- [ ] Não houve regressão funcional evidente

---

## 13. Resumo executivo

O projeto deve priorizar:
- clareza técnica;
- modularização sem exagero;
- consistência de nomenclatura;
- segurança e privacidade;
- manutenção simples;
- validação real antes de conclusão.

Essas regras devem orientar futuras implementações, refatorações e melhorias, especialmente em um produto que combina vida pessoal, relacionamento e uso consciente do tempo.
