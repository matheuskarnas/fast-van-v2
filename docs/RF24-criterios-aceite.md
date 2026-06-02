# RF24: Controle Financeiro do Motorista

## Objetivo Geral

Oferecer ao motorista um painel financeiro simples para controlar mensalidades de passageiros, outras receitas (viagens avulsas, eventos) e despesas operacionais (combustível, manutenção), sem integração com meios de pagamento externos.

---

## Conceitos

| Conceito | Descrição |
|----------|-----------|
| Mensalidade | Valor fixo mensal cobrado de um passageiro de uma linha |
| Receita extra | Viagem avulsa, evento ou qualquer entrada fora da mensalidade |
| Despesa | Saída de dinheiro: combustível, manutenção, pedágio, outros |
| Competência | Mês de referência no formato `YYYY-MM` |

---

## Regras de Validação Globais

- Apenas DRIVER pode gerenciar dados financeiros
- Passageiro pode consultar apenas seu próprio status de mensalidade
- Valores devem ser positivos
- Competência obrigatória em toda transação

---

## Cenários de Sucesso

### Cenário 24.1: Definir valor de mensalidade por passageiro
**Dado** um motorista com passageiros matriculados em uma linha
**Quando** define o valor mensal de um passageiro para a competência atual
**Então** o sistema registra o valor e status `pending`

### Cenário 24.2: Marcar mensalidade como paga
**Dado** uma mensalidade com status `pending`
**Quando** o motorista confirma o recebimento
**Então** o status muda para `paid` com data/hora do registro

### Cenário 24.3: Reverter pagamento por engano
**Dado** uma mensalidade marcada como paga incorretamente
**Quando** o motorista reverte
**Então** o status volta para `pending`

### Cenário 24.4: Adicionar receita extra
**Dado** um motorista autenticado
**Quando** registra uma receita extra (ex: viagem avulsa R$50)
**Então** o sistema registra a entrada com descrição, valor e data

### Cenário 24.5: Adicionar despesa
**Dado** um motorista autenticado
**Quando** registra uma despesa (ex: combustível R$200)
**Então** o sistema registra a saída com categoria, valor e data

### Cenário 24.6: Visualizar dashboard financeiro do mês
**Dado** um motorista com lançamentos no mês
**Quando** acessa o painel financeiro
**Então** vê:
  - Total de mensalidades (pagas e pendentes)
  - Total de receitas extras
  - Total de despesas
  - Lucro líquido estimado (receitas - despesas)
  - Lista de passageiros com mensalidade pendente

### Cenário 24.7: Passageiro consulta sua mensalidade
**Dado** um passageiro com mensalidade registrada
**Quando** acessa seu dashboard (RF26)
**Então** vê status real: `em dia` ou `pendente`

---

## Cenários de Erro

### Cenário 24.8: Valor inválido (≤ 0)
**Quando** motorista informa valor negativo ou zero
**Então** retorna erro de validação

### Cenário 24.9: Passageiro tenta gerenciar pagamentos alheios
**Quando** passageiro tenta alterar status de pagamento
**Então** retorna 403

### Cenário 24.10: Competência em formato inválido
**Quando** competência não está no formato `YYYY-MM`
**Então** retorna erro de validação

---

## Notas Técnicas

### Tabelas
```sql
-- Mensalidades por passageiro
payments (id, line_id, passenger_id, amount, month, status, paid_at, notes)

-- Receitas extras e despesas
financial_entries (id, driver_id, type, category, description, amount, entry_date, month)
-- type: 'income' | 'expense'
-- category: 'fuel' | 'maintenance' | 'toll' | 'extra_trip' | 'other'
```

### Endpoints
- `GET /api/v1/finance/dashboard?month=YYYY-MM` — resumo financeiro (DRIVER)
- `GET /api/v1/finance/lines/:lineId/payments?month=YYYY-MM` — mensalidades da linha (DRIVER)
- `PUT /api/v1/finance/lines/:lineId/payments/:passengerId` — define valor/status (DRIVER)
- `POST /api/v1/finance/entries` — lançar receita ou despesa (DRIVER)
- `GET /api/v1/finance/entries?month=YYYY-MM` — listar lançamentos (DRIVER)
- `GET /api/v1/finance/me/payment-status` — status da própria mensalidade (PASSENGER)
