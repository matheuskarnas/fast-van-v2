# RF17: Gerenciamento de Múltiplas Vans pelo Motorista

## Objetivo Geral

Permitir que o motorista dono opere como empresa de transportes, gerenciando múltiplas vans com motoristas contratados em diferentes linhas, mantendo visão centralizada da frota.

---

## Status: Contemplado em outros RFs

| Funcionalidade | RF que cobre |
|---------------|-------------|
| Cadastrar múltiplas vans | RF2 — múltiplos veículos por motorista |
| Associar van a uma linha | RF2 — `vehicleId` em cada linha |
| Atrelar segundo motorista a uma linha | RF2 — `driver_id` em `lines` |
| Visualizar lotação por linha | RF4/RF5 — dashboard de ocupação |
| Decidir 1 ou 2 vans no dia | RF9 — painel de decisão |
| Dashboard da frota (nº vans, km, ganhos) | RF15/30 — analytics do motorista |

---

## Cenários de Sucesso

### Cenário 17.1: Motorista cadastra segunda van
**Dado** um motorista com uma van cadastrada
**Quando** cadastra outra van com diferentes capacidade e modelo
**Então** ambas ficam disponíveis para associar a linhas
**Implementado por:** RF2 — tela de veículos

### Cenário 17.2: Motorista opera como empresa com múltiplos motoristas
**Dado** um motorista dono com múltiplas linhas
**Quando** atrela um segundo motorista a uma linha via link de convite
**Então** o motorista contratado passa a operar essa linha
**Implementado por:** RF2 — invite de motorista

### Cenário 17.3: Dono vê todas as suas vans e linhas
**Dado** um motorista com frota de múltiplas vans
**Quando** acessa o dashboard
**Então** vê número de vans, linhas ativas, passageiros totais e km estimados
**Implementado por:** RF15/30 — analytics

### Cenário 17.4: Decisão de usar 1 ou 2 vans no dia
**Dado** uma linha com múltiplos veículos disponíveis
**Quando** motorista avalia confirmações do dia
**Então** pode decidir usar apenas 1 van e economizar
**Implementado por:** RF9 — painel de decisão

---

## Notas Técnicas

- RF17 está contemplado pela soma de RF2 (frota + motoristas), RF9 (decisão), RF15/30 (analytics)
- A tela de veículos (`vehicles/index.tsx`) exibe a frota completa com modelo, capacidade e status
- Melhoria adicionada neste RF: visão de frota com a linha associada a cada veículo
