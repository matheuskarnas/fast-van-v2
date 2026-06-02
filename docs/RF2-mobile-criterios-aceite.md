# RF2 Mobile: Cadastro e Gerenciamento de Linhas — Motorista

## Objetivo

Permitir que o motorista visualize, crie e gerencie suas linhas diretamente pelo app mobile, com busca de cidade de origem via IBGE e destino via Google Places.

---

## Tela 1: Lista de Linhas (`(driver)/lines/index`)

### Cenário M2.1: Motorista sem linhas vê estado vazio

**Dado** um motorista autenticado sem linhas cadastradas
**Quando** ele acessa a aba/tela de linhas
**Então** o app exibe uma mensagem de estado vazio
**E** exibe um botão "Criar linha"

### Cenário M2.2: Motorista com linhas vê a lista

**Dado** um motorista autenticado com linhas cadastradas
**Quando** ele acessa a tela de linhas
**Então** o app exibe a lista com origem, destino e veículo de cada linha
**E** cada item é clicável para abrir os detalhes

### Cenário M2.3: Erro ao carregar linhas

**Dado** uma falha de rede ao buscar as linhas
**Quando** a tela carrega
**Então** o app exibe mensagem de erro
**E** exibe botão para tentar novamente

---

## Tela 2: Criar Linha (`(driver)/lines/create`)

### Cenário M2.4: Criar linha com sucesso

**Dado** um motorista autenticado com pelo menos um veículo cadastrado
**Quando** ele preenche origem (via IBGE), destino (via Google Places) e seleciona um veículo
**E** confirma a criação
**Então** a linha é criada no backend
**E** o app navega para os detalhes da linha criada

### Cenário M2.5: Motorista sem veículo é bloqueado

**Dado** um motorista autenticado sem veículos cadastrados
**Quando** ele tenta acessar a criação de linha
**Então** o app exibe mensagem: "Você precisa cadastrar um veículo antes de criar uma linha"
**E** exibe botão para ir ao cadastro de veículo

### Cenário M2.6: Busca de cidade de origem via IBGE

**Dado** o campo de origem na tela de criação
**Quando** o motorista digita parte do nome de uma cidade
**Então** o app consulta a API IBGE e exibe sugestões de municípios
**E** ao selecionar, o nome oficial do município é preenchido

### Cenário M2.7: Busca de destino via Google Places

**Dado** o campo de destino na tela de criação
**Quando** o motorista digita parte do nome do destino
**Então** o app consulta a Google Places API e exibe sugestões
**E** ao selecionar, o nome e coordenadas do local são registrados

### Cenário M2.8: Campos obrigatórios vazios

**Dado** o formulário de criação de linha
**Quando** o motorista tenta confirmar sem preencher origem, destino ou veículo
**Então** o app exibe mensagem: "Origem, destino e veículo são obrigatórios"
**E** a linha não é criada

---

## Tela 3: Detalhes da Linha (`(driver)/lines/[lineId]/index`)

### Cenário M2.9: Visualizar detalhes da linha

**Dado** uma linha criada
**Quando** o motorista acessa os detalhes
**Então** o app exibe: origem, destino, veículo, capacidade e lista de pontos
**E** exibe botão "Adicionar ponto"
**E** exibe botão "Gerar convite"

### Cenário M2.10: Gerar link de convite

**Dado** a tela de detalhes de uma linha
**Quando** o motorista toca em "Gerar convite"
**Então** o app gera o token via API
**E** abre o compartilhamento nativo do sistema com o link do convite

### Cenário M2.11: Remover ponto sem passageiros

**Dado** um ponto da linha sem passageiros vinculados
**Quando** o motorista toca em remover
**Então** o app exibe confirmação
**E** após confirmar, o ponto é removido e a lista é atualizada

### Cenário M2.12: Tentar remover ponto com passageiros

**Dado** um ponto com passageiros vinculados
**Quando** o motorista toca em remover
**Então** o app exibe mensagem: "Remova os passageiros vinculados antes de deletar este ponto"
**E** o ponto não é removido

---

## Tela 4: Adicionar / Editar Ponto (`(driver)/lines/[lineId]/point`)

### Cenário M2.13: Adicionar ponto com sucesso

**Dado** a tela de adicionar ponto
**Quando** o motorista preenche endereço, tipo (embarque/desembarque) e segmento (ida/volta)
**E** confirma
**Então** o ponto é criado no backend
**E** o app volta para detalhes da linha com o novo ponto listado

### Cenário M2.14: Editar ponto existente

**Dado** um ponto já criado
**Quando** o motorista acessa a edição e altera endereço ou tipo
**E** confirma
**Então** o ponto é atualizado no backend
**E** o app reflete as alterações na tela de detalhes

### Cenário M2.15: Adicionar ponto sem endereço

**Dado** o formulário de adição de ponto
**Quando** o motorista tenta confirmar sem endereço
**Então** o app exibe mensagem: "Endereço é obrigatório"
**E** o ponto não é criado

---

## Notas Técnicas Mobile

- Origem consultada via `https://servicodados.ibge.gov.br/api/v1/localidades/municipios?nome={query}`
- Destino consultado via Google Places Autocomplete API (chave já configurada no `.env`)
- Seleção de veículo feita via lista dos veículos cadastrados pelo motorista (GET /api/v1/vehicles)
- Horários de partida/chegada/retorno são opcionais e podem ser editados depois
- Convite compartilhado via `Share.share()` nativo do React Native
- Navegação: lista → detalhes → adicionar ponto (stack navigation)
