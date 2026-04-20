# RF5: Sistema de Alerta de Lotação Crítica

## Objetivo Geral

Permitir que o motorista receba alertas automáticos quando a ocupação de uma linha atingir 80% ou ultrapassar 100% da capacidade da van, com atualização em tempo real.

---

## Objetivo

Exibir alertas de lotação para o motorista dono da linha e para o motorista atrelado, considerando a próxima data da linha e separando os indicadores de ida e volta.

---

## Regras de Validação Globais

### Escopo da consulta

- O alerta deve ser calculado para a próxima data da linha
- A capacidade utilizada no cálculo deve ser herdada da linha/van
- O cálculo deve ser feito separadamente para `ida` e `volta`

### Regras de alerta

- A partir de 80% de ocupação, o sistema deve emitir alerta de lotação crítica
- Acima de 100% de ocupação, o sistema deve emitir alerta de capacidade excedida
- O percentual de ocupação deve ser inteiro, sem casas decimais

### Atualização em tempo real (push/live)

- Toda alteração de confirmação que altere a ocupação da linha deve atualizar os alertas em tempo real
- A tela do motorista deve ser notificada quando um alerta surgir, mudar de severidade ou desaparecer

### Autorização

- Apenas o motorista dono da linha e o motorista atrelado podem visualizar os alertas
- Passageiros e motoristas sem vínculo com a linha não podem acessar a lotação crítica

### Comportamento operacional

- O sistema deve exibir a quantidade de confirmados por trecho
- O sistema deve exibir o percentual de ocupação por trecho
- A lista exibida para o motorista deve conter apenas passageiros confirmados

---

## Cenários de Sucesso

### Cenário 5.1: Emitir alerta de lotação crítica a partir de 80%

**Dado** uma linha com capacidade válida
**E** a ocupação da ida ou volta atingindo 80% ou mais
**Quando** o motorista acessa os alertas da linha
**Então** o sistema exibe alerta de lotação crítica

### Cenário 5.2: Emitir alerta de capacidade excedida acima de 100%

**Dado** uma linha com capacidade válida
**E** a ocupação da ida ou volta acima de 100%
**Quando** o motorista acessa os alertas da linha
**Então** o sistema exibe alerta de capacidade excedida

### Cenário 5.3: Exibir alerta por trecho

**Dado** uma linha com confirmações diferentes entre ida e volta
**Quando** o motorista acessa os alertas da próxima data
**Então** o sistema exibe alertas separados para ida e volta

### Cenário 5.4: Atualizar alerta em tempo real

**Dado** a tela de alertas aberta pelo motorista
**Quando** a confirmação de um passageiro altera a ocupação da linha
**Então** o alerta é atualizado em tempo real

### Cenário 5.5: Exibir percentual inteiro

**Dado** uma linha com confirmações suficientes para gerar alerta
**Quando** o sistema calcula o alerta
**Então** o percentual exibido é inteiro, sem casas decimais

### Cenário 5.6: Acesso permitido ao motorista dono

**Dado** uma linha com motorista dono definido
**Quando** o motorista dono consulta os alertas
**Então** o sistema permite a visualização

### Cenário 5.7: Acesso permitido ao motorista atrelado

**Dado** uma linha com motorista atrelado definido
**Quando** o motorista atrelado consulta os alertas
**Então** o sistema permite a visualização

---

## Cenários de Erro

### Cenário 5.8: Passageiro tenta acessar alertas

**Dado** um usuário passageiro
**Quando** ele tenta consultar os alertas da linha
**Então** o sistema bloqueia a operação
**E** exibe erro de autorização

### Cenário 5.9: Motorista não vinculado tenta acessar alertas

**Dado** um motorista sem vínculo com a linha
**Quando** ele tenta consultar os alertas
**Então** o sistema bloqueia a operação
**E** exibe erro de autorização

### Cenário 5.10: Consulta fora da próxima data

**Dado** uma linha com próxima data definida
**Quando** o motorista tenta consultar uma data diferente
**Então** o sistema bloqueia a operação
**E** exibe erro de regra de negócio

### Cenário 5.11: Linha inexistente

**Dado** um identificador de linha inválido
**Quando** o motorista tenta consultar os alertas
**Então** o sistema bloqueia a operação
**E** exibe erro: `Linha não encontrada`

### Cenário 5.12: Capacidade inválida na linha

**Dado** uma linha com capacidade nula ou menor/igual a zero
**Quando** o motorista tenta consultar os alertas
**Então** o sistema bloqueia a operação
**E** exibe erro de integridade da linha

---

## Notas Técnicas

- Reaproveitar o cálculo de ocupação do RF4 para construir os alertas
- Alertas devem ser disparados sempre que os indicadores mudarem
- O serviço deve diferenciar lotação crítica de capacidade excedida
- A resposta deve incluir ocupação por trecho e status do alerta
- O canal live deve permitir que a tela do motorista seja atualizada sem recarregar
