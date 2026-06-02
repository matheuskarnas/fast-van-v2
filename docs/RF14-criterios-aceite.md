# RF14: Avaliação de Viagens

## Objetivo Geral

Permitir que passageiros avaliem o motorista e o veículo após as viagens, gerando reputação e confiança na plataforma.

---

## Critérios de Avaliação

### Motorista
| Critério | Escala |
|----------|--------|
| Pontualidade | 1–5 estrelas |
| Qualidade da direção | 1–5 estrelas |
| Simpatia | 1–5 estrelas |

### Veículo
| Critério | Escala |
|----------|--------|
| Conforto | 1–5 estrelas |
| Qualidade/estado do veículo | 1–5 estrelas |
| Manutenção e higiene | 1–5 estrelas |

---

## Regras de Validação Globais

- Apenas PASSENGER pode avaliar
- Um passageiro pode avaliar cada linha uma vez por mês (competência `YYYY-MM`)
- Avaliação permite um campo de comentário opcional
- Apenas passageiros matriculados na linha podem avaliar
- Motorista e passageiro podem ver a média das avaliações

---

## Cenários de Sucesso

### Cenário 14.1: Passageiro avalia motorista
**Dado** um passageiro matriculado em uma linha
**Quando** submete avaliação do motorista com notas por critério
**Então** a avaliação é registrada para a competência atual

### Cenário 14.2: Passageiro avalia veículo
**Dado** um passageiro matriculado em uma linha
**Quando** submete avaliação do veículo com notas por critério
**Então** a avaliação é registrada para o veículo da linha

### Cenário 14.3: Motorista vê média das suas avaliações
**Dado** um motorista com avaliações registradas
**Quando** acessa seu perfil ou dashboard
**Então** vê a média de cada critério e o total de avaliações

### Cenário 14.4: Passageiro não avalia mais de uma vez por mês
**Dado** um passageiro que já avaliou uma linha no mês atual
**Quando** tenta avaliar novamente
**Então** o sistema informa que já foi avaliado este mês
**E** exibe a avaliação já feita

### Cenário 14.5: Avaliação com comentário opcional
**Dado** um formulário de avaliação
**Quando** passageiro preenche um comentário junto com as notas
**Então** o comentário é salvo com a avaliação

---

## Cenários de Erro

### Cenário 14.6: Passageiro não matriculado tenta avaliar
**Dado** um passageiro sem vínculo com a linha
**Quando** tenta avaliar
**Então** o sistema retorna 403

### Cenário 14.7: Nota fora do intervalo (1-5)
**Quando** nota enviada for < 1 ou > 5
**Então** o sistema retorna erro de validação

### Cenário 14.8: Motorista tenta avaliar
**Dado** um usuário com role DRIVER
**Quando** tenta submeter avaliação
**Então** o sistema retorna 403

---

## Notas Técnicas

- Tabela: `ratings (id, line_id, passenger_id, driver_id, vehicle_id, month, punctuality, driving, friendliness, comfort, vehicle_quality, hygiene, comment, created_at)`
- `UNIQUE (line_id, passenger_id, month)` — uma avaliação por mês por linha
- Endpoints:
  - `POST /api/v1/ratings` — submeter avaliação (PASSENGER)
  - `GET /api/v1/ratings/driver/:driverId` — médias do motorista
  - `GET /api/v1/ratings/vehicle/:vehicleId` — médias do veículo
  - `GET /api/v1/ratings/me?lineId=&month=` — avaliação já feita pelo passageiro
- Mobile: botão "Avaliar" no dashboard do passageiro e na tela de linhas
