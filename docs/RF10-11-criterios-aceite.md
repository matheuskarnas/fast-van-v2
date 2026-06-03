# RF10/11: Marketplace B2B — Solicitações Empresariais de Transporte

## Objetivo Geral

Permitir que empresas (cadastradas como passageiros com flag empresa) publiquem solicitações de transporte para seus funcionários. Motoristas com disponibilidade no horário podem se interessar, abrir chat para negociar e criar a linha.

---

## Fluxo

1. Empresa cria uma solicitação de transporte (B2B request)
2. Motoristas com disponibilidade veem as solicitações abertas
3. Motorista interessado abre chat privado com a empresa
4. Após negociação, motorista cria a linha com base na solicitação

---

## Cenários de Sucesso

### Cenário 10.1: Empresa cria solicitação de transporte
**Dado** um usuário cadastrado com perfil de empresa
**Quando** publica solicitação com: destino (empresa), horários, número de passageiros, dias da semana
**Então** a solicitação fica visível para motoristas com disponibilidade

### Cenário 10.2: Motorista marca disponibilidade
**Dado** um motorista com período ocioso (ex: 9h–17h)
**Quando** marca disponibilidade com cidade e horário
**Então** suas linhas aparecem nas buscas de empresas da região

### Cenário 11.1: Motorista vê solicitações empresariais abertas
**Dado** solicitações publicadas por empresas
**Quando** motorista acessa o marketplace B2B
**Então** vê lista com destino, horários, número de funcionários e cidade

### Cenário 11.2: Motorista abre chat com empresa
**Dado** uma solicitação de interesse do motorista
**Quando** clica em "Tenho interesse"
**Então** abre chat privado com o responsável da empresa

### Cenário 11.3: Motorista fecha negócio e cria linha
**Dado** negociação concluída no chat
**Quando** motorista cria a linha a partir da solicitação
**Então** a solicitação é marcada como `contracted`
**E** a nova linha está disponível para os funcionários entrarem

### Cenário 11.4: Empresa pode fechar a solicitação
**Dado** uma solicitação aberta
**Quando** empresa fecha ou cancela
**Então** a solicitação fica com status `closed` e some do marketplace

---

## Cenários de Erro

### Cenário E1: Campos obrigatórios ausentes
**Quando** solicitação enviada sem destino ou horários
**Então** retorna 400

### Cenário E2: Passageiro comum tenta ver marketplace B2B
**Quando** passageiro sem flag empresa acessa lista de solicitações B2B para publicar
**Então** pode ver mas não pode criar solicitação como empresa

---

## Notas Técnicas

- Nova tabela: `b2b_requests (id, company_id, destination, origin_city, arrival_time, departure_time, passenger_count, days_of_week, status, created_at)`
- `status`: `open` | `contracted` | `closed`
- Endpoints:
  - `POST /api/v1/marketplace/b2b` — criar solicitação (qualquer PASSENGER)
  - `GET /api/v1/marketplace/b2b` — listar abertas (DRIVER)
  - `GET /api/v1/marketplace/b2b/mine` — minhas solicitações (PASSENGER)
  - `PATCH /api/v1/marketplace/b2b/:id` — atualizar status
- Chat usa o sistema existente (RF13)
- Mobile: seção "Marketplace" no menu do motorista e do passageiro
