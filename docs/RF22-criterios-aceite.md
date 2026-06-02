# RF22: Cálculo de Distância e Tempo da Rota

## Objetivo Geral

Calcular e exibir a distância total e o tempo estimado de deslocamento da rota de uma linha, com base nos pontos de embarque/desembarque cadastrados, auxiliando o motorista no planejamento operacional.

---

## Regras de Validação Globais

- Cálculo realizado via Google Directions API com os pontos da linha como waypoints
- Apenas pontos com latitude e longitude cadastrados participam do cálculo
- Segmentos de ida e volta são calculados separadamente
- Motorista dono ou atrelado pode consultar; passageiro não acessa

---

## Cenários de Sucesso

### Cenário 22.1: Calcular distância e tempo da rota de ida
**Dado** uma linha com ao menos 2 pontos de ida com lat/lng
**Quando** o motorista acessa o mapa da linha
**Então** o sistema exibe a distância total da ida (km) e o tempo estimado

### Cenário 22.2: Calcular distância e tempo da rota de volta
**Dado** uma linha com ao menos 2 pontos de volta com lat/lng
**Quando** o motorista acessa o mapa da linha
**Então** o sistema exibe separadamente a distância e tempo da volta

### Cenário 22.3: Exibir distância e tempo combinados
**Dado** uma linha com pontos de ida e volta
**Quando** o cálculo é concluído
**Então** o sistema exibe a distância e tempo total (ida + volta)

### Cenário 22.4: Linha sem pontos suficientes
**Dado** uma linha com menos de 2 pontos com lat/lng
**Quando** o motorista acessa o mapa
**Então** o sistema informa que não há pontos suficientes para calcular

---

## Cenários de Erro

### Cenário 22.5: Falha na API do Google
**Dado** uma falha de conectividade ou cota excedida
**Quando** o cálculo é solicitado
**Então** o sistema exibe mensagem de erro amigável
**E** os marcadores do mapa continuam visíveis

---

## Notas Técnicas

- Cálculo client-side via `GET https://maps.googleapis.com/maps/api/directions/json`
- Waypoints ordenados por posição de cadastro dentro de cada segmento
- Resultado exibido no painel inferior da tela de mapa (`map.tsx`)
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` — mesma chave usada para Places
- Distância formatada em km com 1 decimal; duração em minutos ou horas
