# RF15/30: Dashboard do Motorista — Relatórios e Análises

## Objetivo Geral

Oferecer ao motorista dono uma visão consolidada e histórica de suas operações: frota, linhas, passageiros, estimativa de ganhos, km estimados e economia obtida com decisões de van única (RF9).

---

## RF15 — Dashboard Operacional

### Métricas exibidas
| Métrica | Fonte |
|---------|-------|
| Total de passageiros ativos | `line_enrollments` |
| Número de vans cadastradas | `vehicles` |
| Número de linhas ativas | `lines` |
| Estimativa de km rodados no mês | soma distâncias das linhas (RF22 data) |
| Receita estimada do mês | mensalidades registradas (RF24) |
| Despesas do mês | `financial_entries` (RF24) |
| Lucro estimado | receita − despesas |

### Filtros
- Por mês (`YYYY-MM`)
- Por linha específica
- Por van específica

---

## RF30 — Relatório de Economia

### Métricas
| Métrica | Descrição |
|---------|-----------|
| Dias com van única | dias em que `decision = 'single_van'` (RF9) |
| Economia estimada | km × custo_por_km × dias van única |
| Taxa de ocupação média | média de `occupancy.percentage` por mês |
| Dias com ausências altas | dias em que >50% marcaram ausência |

---

## Cenários de Sucesso

### Cenário 15.1: Motorista acessa dashboard mensal
**Dado** um motorista com linhas, vans e passageiros cadastrados
**Quando** acessa o dashboard do mês atual
**Então** vê métricas consolidadas (passageiros, linhas, vans, ganhos, km)

### Cenário 15.2: Filtrar por mês
**Dado** histórico de vários meses
**Quando** seleciona um mês específico
**Então** vê apenas dados daquele mês

### Cenário 15.3: Filtrar por linha
**Dado** múltiplas linhas cadastradas
**Quando** seleciona uma linha específica
**Então** vê métricas apenas daquela linha

### Cenário 30.1: Visualizar relatório de economia
**Dado** decisões de van única registradas no mês (RF9)
**Quando** acessa o relatório de economia
**Então** vê quantos dias usou 1 van e a economia estimada

### Cenário 30.2: Taxa de ocupação média
**Dado** confirmações de passageiros no mês
**Quando** acessa o relatório
**Então** vê percentual médio de ocupação por linha

---

## Cenários de Erro

### Cenário E1: Passageiro tenta acessar
**Quando** usuário com role PASSENGER tenta acessar
**Então** retorna 403

### Cenário E2: Mês inválido
**Quando** mês informado não está no formato YYYY-MM
**Então** retorna 400

---

## Notas Técnicas

- Novo endpoint: `GET /api/v1/driver/dashboard?month=YYYY-MM&lineId=&vehicleId=`
- Dados consolidados de: `lines`, `vehicles`, `line_enrollments`, `financial_entries`, `daily_van_decisions`
- Estimativa de km: usa distância das linhas × dias úteis estimados (22 por mês)
- Custo/km estimado: R$ 0.80 (configurável)
- Mobile: nova tela `(driver)/analytics.tsx` linkada da home e aba lateral
