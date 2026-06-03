# RF12/27: Marketplace de Eventos e Viagens Esporádicas

## Objetivo Geral

Permitir que passageiros criem demandas de transporte para eventos específicos (shows, jogos, feiras) e que outros passageiros demonstrem interesse. Motoristas podem ver as demandas e entrar em contato para oferecer o serviço.

---

## Fluxo

1. Passageiro cria demanda: evento, data, hora, cidade de partida, número de pessoas interessadas
2. Outros passageiros pesquisam eventos e demonstram interesse ("Quero ir também")
3. Contador de interessados sobe a cada adesão
4. Motorista vê as demandas abertas e pode abrir chat para negociar
5. Motorista pode também publicar uma oferta de viagem esporádica

---

## Cenários de Sucesso

### Cenário 12.1: Passageiro cria demanda de evento
**Dado** um passageiro autenticado
**Quando** cria demanda com: evento, data, hora de início, hora de término, cidade de partida, número de amigos já confirmados
**Então** a demanda fica visível no marketplace de eventos

### Cenário 12.2: Passageiro demonstra interesse em demanda existente
**Dado** uma demanda aberta de outro passageiro
**Quando** clica em "Tenho interesse" / "Quero ir também"
**Então** o contador de interessados aumenta em 1

### Cenário 12.3: Passageiro pesquisa eventos por cidade
**Dado** demandas publicadas para diferentes cidades
**Quando** filtra por cidade de partida ou data
**Então** vê apenas as demandas relevantes

### Cenário 27.1: Motorista vê demandas abertas
**Dado** demandas publicadas por passageiros
**Quando** motorista acessa o marketplace de eventos
**Então** vê lista com evento, data, cidade, número de interessados

### Cenário 27.2: Motorista abre chat para negociar
**Dado** uma demanda com passageiros interessados
**Quando** motorista clica em "Oferecer transporte"
**Então** abre chat privado com o criador da demanda

### Cenário 27.3: Motorista publica oferta de viagem esporádica
**Dado** um motorista com disponibilidade
**Quando** publica uma oferta (evento, data, hora, cidade, vagas, valor)
**Então** a oferta fica visível para passageiros buscarem

---

## Cenários de Erro

### Cenário E1: Campos obrigatórios ausentes
**Quando** demanda enviada sem evento, data ou cidade
**Então** retorna 400

### Cenário E2: Passageiro demonstra interesse duas vezes
**Quando** mesmo passageiro tenta se adicionar novamente
**Então** retorna 409 (já registrado)

---

## Notas Técnicas

- Tabela: `event_requests (id, creator_id, event_name, event_date, start_time, end_time, origin_city, destination, interested_count, status, created_at)`
- Tabela: `event_interests (id, request_id, passenger_id, created_at)` — UNIQUE (request_id, passenger_id)
- Endpoints:
  - `POST /api/v1/marketplace/events` — criar demanda (PASSENGER)
  - `GET /api/v1/marketplace/events` — listar abertas com filtros (todos)
  - `POST /api/v1/marketplace/events/:id/interest` — demonstrar interesse (PASSENGER)
  - `GET /api/v1/marketplace/events/mine` — minhas demandas (PASSENGER)
- Mobile: seção "Eventos" no marketplace (abas: Demandas / Minhas)
- Chat usa o sistema RF13 existente
