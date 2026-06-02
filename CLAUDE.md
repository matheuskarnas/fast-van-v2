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

---

## MODELO DE NEGÓCIO COMPLETO

### Usuários

Dois perfis distintos:

**Motorista (DRIVER)**
- Cadastra com: nome, CPF, CNH, data de nascimento, email, senha
- Pode cadastrar veículos (van, micro-ônibus, ônibus — capacidade máx 68)
- Cria e gerencia linhas (rotas fixas)
- Visualiza lotação por slot de horário
- Toma decisão de usar 1 ou 2 vans no dia
- Pode operar como empresa (múltiplas vans, múltiplos motoristas)

**Passageiro (PASSENGER)**
- Cadastra com: nome, CPF, data de nascimento, email, senha
- Entra em linhas via convite do motorista
- **Ao entrar na linha, escolhe seu horário fixo de ida e de volta** (departure_time + arrival_time)
- Confirma presença/ausência diária dentro do slot cadastrado
- Pode solicitar slot diferente em um dia específico (RF6)

---

### Modelo Central: Linhas e Time Slots (CRÍTICO)

Uma linha pode ter **múltiplos horários de ida** e **múltiplos horários de volta** (ex: 07:10, 08:00 de ida; 10:55, 12:35 de volta).

**Cada horário é um slot independente com sua própria lotação.**

```
Linha "Caçapava → Fatec-SJC"
  Slots de ida:  07:10 (12/16 vagas), 08:00 (4/16 vagas)
  Slots de volta: 10:55 (8/16 vagas), 12:35 (7/16 vagas)
```

**Ao aceitar o convite**, o passageiro escolhe:
- Qual horário de ida vai usar habitualmente (`departure_time`)
- Qual horário de volta vai usar habitualmente (`arrival_time`)

Essa informação fica em `line_enrollments.departure_time` e `line_enrollments.arrival_time`.

**A capacidade é contada por slot**: 16 vagas no slot das 07:10, 16 vagas no das 08:00 — não 32 total.

---

### RF3 — Confirmação de Presença

O passageiro confirma presença **dentro do seu slot cadastrado**. Status possíveis:
- `vai e volta` (padrão — app assume que vai)
- `não vai e nem volta`
- `só vou e não volto`
- `não vou mas volto`

Regras:
- Alteração permitida até o horário de embarque do ponto do passageiro
- Ausência não remove o passageiro da linha
- Status é registrado por `(line_id, passenger_id, date)`

---

### RF6 — Exceção de Horário + Fila de Espera (CRÍTICO)

**Caso de uso:** Ana está cadastrada no slot 07:10, mas hoje precisa ir às 08:00.

Fluxo:
1. Passageiro solicita slot alternativo para uma data específica (`alternate_departure_time`)
2. Sistema verifica vagas no slot 08:00
3. **Se tem vaga** → passageiro é confirmado diretamente no slot 08:00 naquele dia (`slot_status = 'switched'`)
4. **Se está lotado** → passageiro entra na fila de espera (`slot_waitlist`)
5. Se alguém do slot 08:00 marcar ausência → primeiro da fila entra automaticamente

**Prioridade de vaga:**
- Passageiros com `departure_time = '08:00'` têm prioridade absoluta
- Solicitantes via RF6 só entram se houver vaga após os fixos

---

### RF4 — Ocupação em Tempo Real (por slot)

O dashboard do motorista mostra:
```
Slot 07:10 → Ida: 12/16 (75%) ✅ | Volta 10:55: 8/16 (50%) ✅
Slot 08:00 → Ida: 14/16 (87%) ⚠️ | Volta 12:35: 7/16 (43%) ✅
```

- Ocupação calculada por `departure_time` e `arrival_time`, não por "ida/volta" genérico
- Cada slot tem seu próprio badge de alerta (RF5)

---

### RF5 — Alertas de Lotação por Slot

- **≥80% e ≤100%** → alerta crítico (amarelo) por slot
- **>100%** → capacidade excedida (vermelho) por slot
- Cada slot tem seu próprio nível de alerta independente

---

### RF7 — Geofencing Check-in

- Motorista inicia linha manualmente antes de sair
- Ao chegar no raio de um ponto, registra check-in
- Sistema notifica passageiros confirmados do **próximo ponto**
- Pontos sem confirmados são ignorados no dia
- Apenas motorista dono ou atrelado pode operar

---

### RF9 — Painel de Decisão (1 ou 2 Vans)

- Motorista com 2 vans na mesma linha vê confirmações totais do dia
- Se confirmações cabem em 1 van → pode cancelar a segunda e mover todos para uma
- Se lota a primeira → solicita segunda van (da frota própria ou Uber/99)
- Rota ajustada com todos os passageiros presentes

---

### Fluxo de Entrada na Linha

1. Motorista cria linha e gera link de convite
2. Passageiro recebe link `fastvanmobile://invite/TOKEN`
3. Tela de preview mostra: nome da linha, rota, capacidade por slot
4. Passageiro faz login (ou cria conta)
5. **Passageiro escolhe seu horário fixo de ida e volta**
6. Sistema verifica se há vagas no slot escolhido
7. Se sim → `line_enrollments` criado com `departure_time` e `arrival_time`
8. Se não → opção de entrar na fila de espera (RF6)

---

### Banco de Dados — Estrutura Relevante

```sql
-- Tabelas principais
users (id, name, email, role, ...)
vehicles (id, driver_id, capacity, ...)
lines (id, owner_driver_id, driver_id, name, origin_city, destination_place,
       capacity, arrival_times[], departure_times[], ...)

-- Matrícula do passageiro na linha COM SLOT FIXO
line_enrollments (id, line_id, passenger_id,
                  departure_time TEXT,   -- ex: "07:10"
                  arrival_time TEXT)     -- ex: "12:35"

-- Presença diária COM SUPORTE A SLOT ALTERNATIVO (RF6)
presence_records (id, line_id, passenger_id, date, status,
                  alternate_departure_time TEXT,   -- RF6: slot diferente no dia
                  alternate_arrival_time TEXT,
                  slot_status TEXT)                -- 'confirmed'|'switched'|'waitlist'

-- Fila de espera por slot (RF6)
slot_waitlist (id, line_id, passenger_id, date,
               requested_departure_time, requested_arrival_time, created_at)

-- Pontos de embarque/desembarque
line_points (id, line_id, address, type, segment, latitude, longitude, place_id)

-- Convites
invites (id, line_id, token, expires_at, created_at)
```

---

## Status dos Requisitos Funcionais

| RF | Nome | Backend | Mobile | Testes |
|----|------|---------|--------|--------|
| 1 | Cadastro de Usuários | ✅ | ✅ | ✅ 40+ |
| 2 | Veículos + Linhas | ✅ | ✅ | ✅ 32 |
| 3 | Confirmação de Presença | ✅ parcial (sem slot) | ✅ tela | ✅ (1 falha RF3-http) |
| 4 | Ocupação Tempo Real | ⚠️ por segmento (sem slot) | ✅ dashboard | ✅ |
| 5 | Alerta Lotação | ⚠️ por segmento (sem slot) | ✅ badges | ✅ |
| 6 | Lista Espera + Slot Troca | ❌ | ❌ | ❌ |
| 7 | Geofencing Check-in | ✅ | ⏳ | ✅ |
| 8 | Ausência Última Hora | ❌ | ❌ | ❌ |
| 9 | Painel 1 ou 2 Vans | ❌ | ❌ | ❌ |
| 13 | Chat | ✅ | ✅ | ✅ |
| - | Convites | ✅ | ✅ | ✅ |

**Em andamento:** Adicionar time slots em `line_enrollments` + refatorar RF3/RF4/RF5/RF6 para modelo por slot.

---

## Endpoints Disponíveis

### Linhas
- `POST /api/v1/lines` — criar linha (DRIVER)
- `GET /api/v1/lines` — listar linhas do motorista (DRIVER)
- `GET /api/v1/lines/:id` — detalhes da linha
- `POST /api/v1/lines/:id/points` — adicionar ponto
- `PATCH /api/v1/lines/:id/points/:pointId` — editar ponto
- `DELETE /api/v1/lines/:id/points/:pointId` — remover ponto

### Convites
- `POST /api/v1/lines/:lineId/invite` — gerar convite (DRIVER)
- `POST /api/v1/lines/invite/accept` — aceitar convite com `{ token, departureTime, arrivalTime }` (PASSENGER)
- `GET /api/v1/lines/invite/:token/preview` — preview público da linha

### Presença (RF3/RF6)
- `GET /api/v1/presence/me/lines?date=YYYY-MM-DD` — linhas + status do passageiro
- `PATCH /api/v1/presence/lines/:lineId/me/status` — atualizar status `{ date, status, alternateDepartureTime?, alternateArrivalTime? }`

### Operações (RF4/RF5)
- `GET /api/v1/operations/lines` — listar linhas operacionais (DRIVER)
- `GET /api/v1/operations/lines/:lineId/dashboard?date=YYYY-MM-DD` — dashboard por slot

### Veículos
- `POST /api/v1/vehicles` — cadastrar veículo
- `GET /api/v1/vehicles` — listar veículos do motorista

---

## Testes — Comandos

```bash
cd backend
npm test                                          # Todos
npm test -- --testPathPattern=RF2-linhas          # RF2 unitários
npm test -- --testPathPattern=RF2-linhas-http     # RF2 HTTP
npm test -- --testPathPattern=RF3                 # RF3
npm test -- --testPathPattern=RF4                 # RF4
npm test -- --testPathPattern=RF4-RF5-dashboard   # Dashboard HTTP
npm test -- --testPathPattern=invite              # Convites
```

---

## Alertas Importantes

- **Time slots são por slot, não por linha**: ocupação de 07:10 é independente de 08:00.
- **Dependência circular**: `lineService.js` e `vehicleService.js` — lazy require em `createLine`.
- **Mock DB**: `USE_MOCK_DB=true` ativa mock. Em produção `USE_MOCK_DB=false` + `DATABASE_URL` do Supabase.
- **Falha conhecida**: `RF3-presence-http.integration.test.js` tem 1 falha pré-existente.
- **NÃO usar casts `as unknown as React.ComponentType`** em componentes React Native.
- **IBGE**: busca client-side com cache (`_ibgeCache`) — não usar `?nome=` server-side que não filtra.
- **Sem `time` em pontos**: `line_points` não tem horário fixo — horário vem do slot do `line_enrollments`.
