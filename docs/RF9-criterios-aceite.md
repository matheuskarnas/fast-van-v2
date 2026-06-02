# RF9: Painel de Decisão — Uma ou Duas Vans

## Objetivo Geral

Permitir que o motorista visualize as confirmações de presença do dia e tome uma decisão explícita sobre quantas vans vai operar, registrando no sistema para ajustar a rota e comunicar os passageiros.

---

## Contexto

Dois cenários distintos levam ao RF9:

**Cenário A — Lotação iminente:** A linha está se aproximando da capacidade máxima. O motorista precisa decidir se aciona um segundo veículo com antecedência.

**Cenário B — Dia com poucas confirmações:** O motorista opera duas vans na mesma linha. O número de confirmados cabe em uma só. Ele pode consolidar todos em uma van e cancelar a segunda, economizando combustível e pagamento ao segundo motorista.

---

## Regras de Validação Globais

### Autorização
- Apenas o motorista dono da linha pode registrar a decisão do dia
- O motorista atrelado pode visualizar a decisão, mas não alterá-la

### Escopo
- A decisão é por linha e por data (hoje)
- Uma decisão registrada pode ser atualizada até o início da rota

### Cálculo de confirmados
- Total de confirmados = passageiros com status `vai e volta` ou `só vou e não volto` no slot de ida do dia
- Percentual = total confirmados / capacidade da van principal

### Opções de decisão
- `single_van` — usar apenas 1 van (consolidar todos os passageiros)
- `double_van_fleet` — acionar 2ª van da própria frota
- `double_van_app` — chamar van extra via Uber/99 (registrado apenas como informação)

---

## Cenários de Sucesso

### Cenário 9.1: Visualizar painel de decisão com lotação baixa

**Dado** uma linha com confirmados abaixo da capacidade
**Quando** o motorista acessa o painel de decisão
**Então** o sistema exibe total de confirmados e percentual de ocupação
**E** exibe a sugestão de usar 1 van

### Cenário 9.2: Visualizar painel com lotação alta

**Dado** uma linha com confirmados >= 80% da capacidade
**Quando** o motorista acessa o painel de decisão
**Então** o sistema exibe alerta de lotação crítica
**E** exibe a sugestão de acionar 2ª van

### Cenário 9.3: Registrar decisão de usar 1 van

**Dado** uma linha com confirmados que cabem em 1 van
**Quando** o motorista registra `single_van`
**Então** a decisão é salva para a data
**E** o sistema confirma que a rota será operada com 1 veículo

### Cenário 9.4: Registrar decisão de acionar 2ª van da frota

**Dado** uma linha lotando com segundo veículo disponível na frota
**Quando** o motorista registra `double_van_fleet`
**Então** a decisão é salva com referência ao segundo veículo

### Cenário 9.5: Registrar decisão de chamar Uber/99

**Dado** uma linha lotando sem segundo veículo disponível
**Quando** o motorista registra `double_van_app`
**Então** a decisão é salva como informação operacional

### Cenário 9.6: Atualizar decisão antes do início da rota

**Dado** uma decisão já registrada
**Quando** o motorista altera a decisão antes de iniciar a rota
**Então** a decisão anterior é substituída pela nova

---

## Cenários de Erro

### Cenário 9.7: Passageiro tenta acessar painel

**Dado** um usuário com role PASSENGER
**Quando** tenta acessar o painel de decisão
**Então** o sistema retorna erro de autorização

### Cenário 9.8: Motorista atrelado tenta registrar decisão

**Dado** um motorista atrelado (não dono)
**Quando** tenta registrar decisão
**Então** o sistema retorna erro de autorização

### Cenário 9.9: Data inválida

**Dado** qualquer motorista autorizado
**Quando** envia data em formato inválido
**Então** o sistema retorna erro de validação

---

## Notas Técnicas

- Nova tabela `daily_van_decisions (id, line_id, driver_id, date, decision, vehicle_id?, notes?, created_at)`
- Endpoint: `POST /api/v1/operations/lines/:lineId/decision` com `{ date, decision, vehicleId? }`
- Endpoint: `GET /api/v1/operations/lines/:lineId/decision?date=` para consultar decisão do dia
- No mobile, o painel de decisão é uma seção adicional no dashboard da linha (`dashboard.tsx`)
- A sugestão automática usa o percentual de ocupação: < 80% → sugerir 1 van; >= 80% → sugerir 2 vans
- `double_van_fleet` requer que o motorista dono tenha ao menos 2 veículos cadastrados
