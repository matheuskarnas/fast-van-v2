# RF4: Visualização de Ocupação da Van em Tempo Real

## Objetivo Geral

Permitir que o motorista acompanhe, em tempo real, a ocupação da próxima viagem de cada linha, separando ida e volta e exibindo somente passageiros confirmados.

---

## Objetivo

Exibir para o motorista dono da linha e para o motorista atrelado os dados de ocupação da próxima data da linha, incluindo quantidade de confirmados, percentual de ocupação e rota diária ajustada automaticamente conforme as confirmações de presença.

---

## Regras de Validação Globais

### Escopo da consulta

- A ocupação deve ser consultada apenas para a próxima data da linha
- A capacidade considerada no cálculo deve ser herdada da linha/van
- O cálculo é segmentado por trecho: `ida` e `volta`

### Fórmula e exibição

- Ocupação por trecho = `confirmados do trecho / capacidade da linha`
- O percentual deve ser exibido em inteiro, sem casas decimais
- A listagem exibida na tela deve conter apenas passageiros confirmados

### Atualização em tempo real (push/live)

- Toda alteração de confirmação que impacte número de confirmados ou rota deve atualizar a tela do motorista em tempo real
- Mudanças de status no RF3 devem refletir imediatamente nos indicadores de RF4

### Comportamento da rota diária

- A rota diária deve considerar apenas pontos com ao menos um passageiro confirmado no trecho correspondente
- Se um ponto ficar sem confirmados na próxima data, ele deve ser removido da rota exibida para aquele dia

### Autorização

- Apenas o motorista dono da linha e o motorista atrelado podem visualizar lotação
- Passageiros e motoristas não vinculados à linha não podem acessar os dados de ocupação

---

## Cenários de Sucesso

### Cenário 4.1: Exibir ocupação inicial da próxima data

**Dado** uma linha com próxima data definida e capacidade válida
**Quando** o motorista autorizado acessa a tela de ocupação
**Então** o sistema exibe ocupação da `ida` e da `volta`
**E** exibe quantidade de confirmados e percentual por trecho

### Cenário 4.2: Exibir somente confirmados na ida

**Dado** uma linha com confirmações diferentes por passageiro
**Quando** o motorista consulta a ocupação da próxima data
**Então** a lista da ida exibe somente passageiros confirmados para ida

### Cenário 4.3: Exibir somente confirmados na volta

**Dado** uma linha com confirmações diferentes por passageiro
**Quando** o motorista consulta a ocupação da próxima data
**Então** a lista da volta exibe somente passageiros confirmados para volta

### Cenário 4.4: Atualização live ao marcar ausência total

**Dado** a tela de ocupação aberta pelo motorista
**Quando** um passageiro marca `não vai e nem volta`
**Então** os números e listas de confirmados são atualizados em tempo real

### Cenário 4.5: Atualização live ao marcar somente ida

**Dado** a tela de ocupação aberta pelo motorista
**Quando** um passageiro marca `só vou e não volto`
**Então** a ocupação da ida e da volta é recalculada em tempo real

### Cenário 4.6: Atualização live ao marcar somente volta

**Dado** a tela de ocupação aberta pelo motorista
**Quando** um passageiro marca `não vou mas volto`
**Então** a ocupação da ida e da volta é recalculada em tempo real

### Cenário 4.7: Remover ponto sem confirmados da rota exibida

**Dado** um ponto da linha onde todos os passageiros ficaram ausentes na próxima data
**Quando** o sistema monta a rota exibida para o motorista
**Então** esse ponto não aparece na rota da próxima data

### Cenário 4.8: Percentual de ocupação em inteiro

**Dado** uma linha com capacidade válida e confirmados calculados
**Quando** o sistema calcula a ocupação
**Então** o percentual exibido por trecho é inteiro, sem casas decimais

### Cenário 4.9: Acesso permitido ao motorista dono

**Dado** uma linha com motorista dono definido
**Quando** o motorista dono consulta a ocupação
**Então** o sistema permite a visualização

### Cenário 4.10: Acesso permitido ao motorista atrelado

**Dado** uma linha com motorista atrelado definido
**Quando** o motorista atrelado consulta a ocupação
**Então** o sistema permite a visualização

---

## Cenários de Erro

### Cenário 4.11: Passageiro tenta acessar lotação

**Dado** um usuário passageiro
**Quando** ele tenta consultar a lotação da linha
**Então** o sistema bloqueia a operação
**E** exibe erro de autorização

### Cenário 4.12: Motorista não vinculado tenta acessar lotação

**Dado** uma linha com motoristas vinculados
**E** um motorista externo sem vínculo
**Quando** ele tenta consultar a lotação
**Então** o sistema bloqueia a operação
**E** exibe erro de autorização

### Cenário 4.13: Consulta fora da próxima data

**Dado** uma linha com próxima data definida
**Quando** o motorista tenta consultar uma data diferente
**Então** o sistema bloqueia a operação
**E** exibe erro de regra de negócio

### Cenário 4.14: Linha inexistente

**Dado** um identificador de linha inválido
**Quando** o usuário autorizado tenta consultar lotação
**Então** o sistema bloqueia a operação
**E** exibe erro: `Linha não encontrada`

### Cenário 4.15: Capacidade inválida na linha

**Dado** uma linha com capacidade nula ou menor/igual a zero
**Quando** o motorista tenta consultar a ocupação
**Então** o sistema bloqueia a operação
**E** exibe erro de integridade da linha

---

## Notas Técnicas

- Reaproveitar os estados de presença do RF3 para compor a ocupação do RF4
- Padronizar cálculo de percentual como inteiro com arredondamento
- Implementar canal push/live para atualizar dashboard do motorista sem recarregar tela
- A consulta de RF4 deve validar a próxima data da linha antes de calcular indicadores
- A resposta deve trazer métricas separadas de ida/volta e lista nominal de confirmados por trecho
- Pontos sem confirmados devem ser removidos apenas da projeção da rota do dia
