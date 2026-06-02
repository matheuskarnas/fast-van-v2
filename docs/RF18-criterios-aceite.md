# RF18: Visualização de Pontos no Mapa

## Objetivo Geral

Permitir que o motorista visualize os pontos de embarque e desembarque da linha em um mapa interativo, facilitando a conferência da rota e o planejamento do dia a dia.

---

## Regras de Validação Globais

### Autorização
- Apenas motorista dono ou atrelado à linha pode visualizar o mapa
- Passageiro não acessa o mapa de operação

### Requisito de dados
- Somente pontos com latitude e longitude cadastrados aparecem no mapa
- Pontos sem localização são ignorados na renderização (endereço apenas textual)

### Segmentação
- Pontos de ida são exibidos com cor laranja
- Pontos de volta são exibidos com cor azul
- Polyline conecta os pontos na ordem de cada segmento

---

## Cenários de Sucesso

### Cenário 18.1: Exibir pontos com localização no mapa
**Dado** uma linha com pontos cadastrados via Google Places (lat/lng)
**Quando** o motorista acessa o mapa da linha
**Então** os pontos aparecem como marcadores no mapa
**E** o mapa é enquadrado automaticamente para mostrar todos os pontos

### Cenário 18.2: Diferenciar segmentos por cor
**Dado** uma linha com pontos de ida e volta
**Quando** o mapa é renderizado
**Então** pontos de ida aparecem em laranja
**E** pontos de volta aparecem em azul/marinho
**E** polylines conectam os pontos de cada segmento separadamente

### Cenário 18.3: Ver detalhes do ponto ao tocar
**Dado** o mapa exibindo os marcadores
**Quando** o motorista toca em um marcador
**Então** aparece um card com endereço, segmento e tipo (embarque/desembarque)

### Cenário 18.4: Localização atual do motorista
**Dado** o mapa aberto
**Quando** o GPS está disponível
**Então** a localização atual do motorista é exibida no mapa

### Cenário 18.5: Linha sem pontos com localização
**Dado** uma linha onde nenhum ponto tem lat/lng cadastrado
**Quando** o motorista acessa o mapa
**Então** o sistema exibe estado vazio com instrução para adicionar pontos via Google Places

---

## Cenários de Erro

### Cenário 18.6: Linha não encontrada
**Dado** um lineId inválido
**Quando** o mapa tenta carregar
**Então** o sistema exibe erro e redireciona para a tela anterior

### Cenário 18.7: GPS indisponível
**Dado** permissão de localização negada
**Quando** o mapa é carregado
**Então** o mapa exibe os pontos sem a localização atual do motorista
**E** não bloqueia a visualização dos pontos cadastrados

---

## Notas Técnicas

- Usa `react-native-maps` com `PROVIDER_GOOGLE`
- API key configurada em `app.json` na seção `android.config.googleMaps`
- Tela acessível via botão "Mapa" nos detalhes da linha
- `fitToCoordinates` enquadra todos os pontos automaticamente com 500ms de delay
- Polyline de ida: linha contínua laranja
- Polyline de volta: linha tracejada azul
- Marcadores usam `pinColor` do segmento correspondente
