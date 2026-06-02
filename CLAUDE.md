# FastVan - Instruções para Claude Code

## Projeto

App mobile (React Native + Expo) com backend Node.js/Express para facilitar o dia a dia de passageiros e motoristas de vans escolares/universitárias/empresariais.

## Fluxo de Trabalho

- **Pair programming**: o desenvolvedor dá instruções, Claude executa, o desenvolvedor revisa e aprova.
- **TDD obrigatório**: entender funcionalidade → escrever critérios de aceite → criar testes → implementar código.
- **Documentação primeiro**: toda mudança em regra de negócio deve ser refletida nos docs antes do código.

## Estrutura do Monorepo

```
fast-van-v2/
├── backend/          # API Node.js/Express (CommonJS)
│   ├── src/
│   │   ├── services/       # Lógica de negócio (mock em memória para testes)
│   │   ├── routes/          # Rotas Express (REST, /api/v1/...)
│   │   ├── middlewares/     # authMiddleware (JWT)
│   │   ├── __tests__/       # Jest - unitários e integração HTTP
│   │   ├── config/          # database.js (PostgreSQL + mock)
│   │   ├── database/        # Migrations SQL
│   │   └── utils/           # Validators
│   └── package.json
├── mobile/           # App React Native + Expo 54 + TypeScript
│   ├── app/                 # Rotas Expo Router (file-based)
│   │   ├── (auth)/          # Login, Register, Role
│   │   ├── (app)/
│   │   │   ├── (driver)/    # Telas do motorista
│   │   │   ├── (passenger)/ # Telas do passageiro
│   │   │   └── shared/      # Alertas, mapas, chat grupo
│   │   └── invite/          # Deep linking de convites
│   ├── components/          # Componentes reutilizáveis
│   ├── services/            # Chamadas API (Axios)
│   ├── constants/           # api.ts (endpoints), theme.ts, colors.ts
│   ├── hooks/               # useAuth, useLocation
│   └── types/               # TypeScript interfaces
├── docs/             # Critérios de aceite por RF (Given/When/Then)
└── README.md
```

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Mobile | React Native 0.81 + Expo 54 + TypeScript 5.9 |
| Backend | Node.js 18+ + Express 4.18 (CommonJS) |
| Banco | PostgreSQL (Supabase) — mock em memória para testes |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Testes | Jest 29 + Supertest (backend) |
| Mapas | Google Places API (destino) + IBGE API (cidades) |
| Chat | Firebase (futuro) |

## Convenções de Código

### Backend
- Arquivos: `camelCase.js`
- Serviços retornam sempre `{ success: true/false, ... }` ou `{ success: false, error: "mensagem" }`
- Rotas usam `requireAuth` middleware e checam `req.auth.role`
- Variável `USE_MOCK_DB=true` ativa mock em memória nos testes
- Testes: `RF{N}-{nome}.test.js` (unitário) e `{nome}-http.integration.test.js` (HTTP)

### Mobile
- Componentes: `PascalCase.tsx`
- Hooks: `useHookName.ts`
- Serviços: `camelCase.ts`
- Rotas (Expo Router): `lowercase-with-dashes`
- Usar tokens do tema (`theme.ts`) — nunca cores hardcoded

### Git
```
feat(RF{N}): descrição
fix(auth): descrição
docs: descrição
test(RF{N}): descrição
refactor: descrição
```

## Funcionalidades (MVP) — Status

| RF | Nome | Backend | Mobile | Testes |
|----|------|---------|--------|--------|
| 1 | Cadastro de Usuários | ✅ | ✅ | ✅ 40+ testes |
| 2 | Veículos + Linhas | ✅ serviço + rotas HTTP + PostgreSQL | ✅ lista, criar, detalhes, pontos (Google Places + lat/lng) | ✅ 32 unit + HTTP |
| 3 | Confirmação de Presença | ✅ | ⏳ parcial | ✅ (1 falha conhecida em RF3-presence-http) |
| 4 | Ocupação Tempo Real | ✅ | ⏳ dashboard inicial | ✅ |
| 5 | Alerta Lotação | ✅ | ⏳ | ✅ |
| 7 | Geofencing Check-in | ✅ | ⏳ | ✅ |
| 13 | Chat | ✅ | ✅ telas | ✅ |
| - | Convites (invite) | ✅ | ✅ InviteButton + deep link | ✅ 1 unit + 8 HTTP |

## Task Atual: RF2 Mobile — Telas de Linhas do Motorista

### O que já está pronto
- `backend/src/services/lineService.js` — CRUD completo (createLine, addPickupDropoffPoint, updatePickupDropoffPoint, removePickupDropoffPoint, getLineById, getLinesByDriver, attachDriverToLine, removeLine)
- `backend/src/routes/lineRoutes.js` — todas as rotas HTTP expostas (POST/GET /lines, GET /lines/:id, POST/PATCH/DELETE /lines/:id/points/:pointId, convites)
- `backend/src/__tests__/RF2-linhas.test.js` — 15 testes unitários passando
- `backend/src/__tests__/RF2-linhas-http.integration.test.js` — 17 testes HTTP (precisa validar se todos passam)
- `mobile/constants/api.ts` — endpoints já definidos (CREATE_LINE, GET_LINES, GET_LINE, etc.)

### O que precisa ser feito
1. `mobile/services/driverLines.ts` — serviço mobile para chamar as APIs de linhas
2. `mobile/services/googlePlaces.ts` — busca de destino via Google Places API
3. `mobile/app/(app)/(driver)/lines.tsx` — listagem de linhas do motorista
4. `mobile/app/(app)/(driver)/create-line.tsx` — criação de linha (originCity via IBGE, destinationPlace via Google Places, seleção de veículo, horários)
5. `mobile/app/(app)/(driver)/line-details/[lineId].tsx` — detalhes da linha com pontos e convites

### Regras de Negócio RF2 (Linhas)
- Linha requer: originCity (API IBGE), destinationPlace (Google Places), vehicleId (do motorista)
- Capacidade herdada do veículo selecionado
- Toda linha tem ida e volta por padrão
- Pontos de embarque/desembarque são criados sob demanda (sem horário fixo — só endereço + tipo)
- Pontos com passageiros não podem ser removidos
- Apenas DRIVER dono ou atrelado pode gerenciar a linha
- Veículo deve pertencer ao motorista (validação no backend)
- Critérios de aceite completos em: `docs/RF2-criterios-aceite.md`

### Regras de Negócio Convites
- DRIVER gera token de 32 chars hex, expira em 7 dias
- PASSENGER aceita via deep link (`fastvan://invite/TOKEN`) ou entrada manual
- Detalhes em: `docs/invite-flow.md` e `docs/INVITE-REFACTOR.md`

## Endpoints Disponíveis (api.ts)

### Linhas
- `POST /api/v1/lines` — criar linha (DRIVER)
- `GET /api/v1/lines` — listar linhas do motorista (DRIVER)
- `GET /api/v1/lines/:id` — detalhes da linha (DRIVER dono/atrelado)
- `POST /api/v1/lines/:id/points` — adicionar ponto (DRIVER)
- `PATCH /api/v1/lines/:id/points/:pointId` — editar ponto (DRIVER)
- `DELETE /api/v1/lines/:id/points/:pointId` — remover ponto vazio (DRIVER)

### Convites
- `POST /api/v1/lines/:lineId/invite` — gerar convite (DRIVER)
- `POST /api/v1/lines/invite/accept` — aceitar convite (PASSENGER)

### Veículos
- `POST /api/v1/vehicles` — cadastrar veículo (DRIVER)
- `GET /api/v1/vehicles` — listar veículos do motorista (DRIVER)

## Testes — Comandos

```bash
cd backend
npm test                                    # Todos (esperar 1 falha em RF3-presence-http)
npm test -- --testPathPattern=RF2-linhas    # Unitários RF2
npm test -- --testPathPattern=RF2-linhas-http  # HTTP RF2
npm test -- --testPathPattern=invite        # Invite
```

## Alertas Importantes

- **Dependência circular**: `lineService.js` e `vehicleService.js` se referenciam. O `lineService` usa lazy require dentro de `createLine` para evitar o ciclo.
- **Mock DB**: Todos os serviços usam `process.env.USE_MOCK_DB === "true"` para testes. Em produção, usam PostgreSQL.
- **Sem `time` em pontos**: Pontos de embarque/desembarque NÃO têm horário fixo. O horário depende da execução da rota no dia.
- **Falha conhecida**: `RF3-presence-http.integration.test.js` tem 1 falha pré-existente, não relacionada às mudanças recentes.
- **NÃO usar casts `as unknown as React.ComponentType`** em componentes React Native — são desnecessários e poluem o código.
