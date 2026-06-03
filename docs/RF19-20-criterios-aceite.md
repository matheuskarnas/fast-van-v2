# RF19/20: Sugestão de Pontos pelo Passageiro

## Objetivo Geral

Permitir que passageiros matriculados sugiram novos pontos de embarque/desembarque para acomodar rotinas variadas, e que o motorista dono da linha aprove ou rejeite essas sugestões antes que entrem em operação.

---

## Regras de Validação Globais

- Apenas PASSENGER matriculado na linha pode sugerir pontos
- Apenas o motorista DONO da linha pode aprovar ou rejeitar
- Sugestão fica `pending` até decisão do motorista
- Ao aprovar, o ponto é criado em `line_points` e vinculado ao passageiro
- Passageiro pode ter múltiplos pontos aprovados (rotinas variadas)
- Endereço deve vir do Google Places com lat/lng

---

## Cenários de Sucesso

### Cenário 19.1: Passageiro sugere ponto
**Dado** um passageiro matriculado na linha
**Quando** sugere um endereço com tipo (embarque/desembarque) e segmento (ida/volta)
**Então** a sugestão é registrada com status `pending`

### Cenário 19.2: Sugestão fica pendente
**Dado** uma sugestão criada
**Quando** o passageiro consulta suas sugestões
**Então** vê o status `pending` até o motorista decidir

### Cenário 19.3: Motorista vê sugestões pendentes
**Dado** sugestões pendentes na linha
**Quando** o motorista acessa a lista de sugestões
**Então** vê endereço, tipo, passageiro e data de cada sugestão

### Cenário 19.4: Motorista aprova sugestão
**Dado** uma sugestão pendente
**Quando** o motorista aprova
**Então** o ponto é criado em `line_points` vinculado ao passageiro
**E** a sugestão muda para `approved`

### Cenário 19.5: Motorista rejeita sugestão
**Dado** uma sugestão pendente
**Quando** o motorista rejeita com motivo opcional
**Então** a sugestão muda para `rejected` com o motivo registrado

### Cenário 20.1: Passageiro vê status das sugestões
**Dado** sugestões em diferentes estados
**Quando** o passageiro consulta suas sugestões
**Então** vê pending, approved e rejected com detalhes

### Cenário 20.2: Passageiro sugere múltiplos pontos
**Dado** um passageiro com pontos diferentes por dia
**Quando** sugere vários pontos (ex: ponto A para segunda, ponto B para quinta)
**Então** cada sugestão é registrada e pode ser aprovada individualmente

---

## Cenários de Erro

### Cenário E1: Passageiro não matriculado tenta sugerir
**Quando** usuário sem matrícula tenta criar sugestão
**Então** retorna 403

### Cenário E2: Motorista não dono tenta aprovar
**Quando** motorista atrelado (não dono) tenta aprovar/rejeitar
**Então** retorna 403

### Cenário E3: Endereço obrigatório
**Quando** sugestão enviada sem endereço
**Então** retorna 400

---

## Notas Técnicas

- Tabela: `point_suggestions (id, line_id, passenger_id, address, type, segment, latitude, longitude, place_id, status, rejection_reason, created_at)`
- `status`: `pending` | `approved` | `rejected`
- Ao aprovar: INSERT em `line_points` e atualiza sugestão → `approved`
- Endpoints:
  - `POST /api/v1/lines/:lineId/point-suggestions` (PASSENGER)
  - `GET /api/v1/lines/:lineId/point-suggestions` (DRIVER — pendentes)
  - `PATCH /api/v1/lines/:lineId/point-suggestions/:id` (DRIVER — aprovar/rejeitar)
  - `GET /api/v1/lines/:lineId/point-suggestions/me` (PASSENGER — minhas)
- Mobile: botão "Sugerir ponto" na tela de linhas do passageiro + tela de aprovação nos detalhes da linha (motorista)
