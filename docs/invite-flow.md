# Fluxo de Geração e Aceitar Link de Convite para Linhas

## Visão Geral

O link de convite permite que um motorista (dono de uma linha) convide passageiros a se juntarem à sua linha. O passageiro recebe um token único e pode aceitar o convite para entrar na linha.

## Fluxo de Negócio

```
Motorista cria linha
        ↓
Motorista negocia com passageiro via chat ou outro meio
        ↓
Motorista gera link de convite (token)
        ↓
Motorista compartilha link com passageiro (WhatsApp, email, etc)
        ↓
Passageiro clica no link ou insere o token no app
        ↓
Passageiro aceita o convite → é adicionado à linha
```

## Endpoints da API

### 1. Criar Link de Convite

**POST** `/api/v1/lines/:lineId/invite`

#### Autenticação
- **Tipo**: Bearer Token (JWT)
- **Role Requerida**: DRIVER

#### Parâmetros

- `lineId` (URL param): ID da linha para a qual criar o convite
- `expiresInHours` (body, opcional): Quantidade de horas até o convite expirar (padrão: 72 horas)

#### Response (201 Created)

```json
{
  "success": true,
  "data": {
    "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4",
    "url": "http://localhost:3000/invite/a1b2c3d4e5f6g7h8i9j0k1l2m3n4",
    "expiresAt": "2026-05-12T13:26:00.000Z"
  }
}
```

#### Exemplo de Uso (cURL)

```bash
curl -X POST http://localhost:3001/api/v1/lines/line-123/invite \
  -H "Authorization: Bearer TOKEN_AQUI" \
  -H "Content-Type: application/json"
```

#### Exemplo de Uso (JavaScript/Axios)

```javascript
import { createLineInvite } from "@/services/operations";

const result = await createLineInvite("line-123");
if (result.success) {
  console.log("Link de convite:", result.data.url);
  // Compartilhar result.data.url com o passageiro
}
```

---

### 2. Aceitar Link de Convite

**POST** `/api/v1/lines/invite/accept`

#### Autenticação
- **Tipo**: Bearer Token (JWT)
- **Role Requerida**: PASSENGER

#### Parâmetros

- `token` (body): Token do convite recebido do motorista

#### Response (200 OK)

```json
{
  "success": true
}
```

#### Erros Possíveis

- **400 Bad Request**: Token inválido, expirado ou não fornecido
- **403 Forbidden**: Usuário não é passageiro
- **401 Unauthorized**: Token de autenticação inválido/expirado

#### Exemplo de Uso (JavaScript/Axios)

```javascript
import { acceptLineInvite } from "@/services/operations";

const result = await acceptLineInvite("a1b2c3d4e5f6g7h8i9j0k1l2m3n4");
if (result.success) {
  console.log("Você entrou na linha com sucesso!");
  // Navegar para a tela de linhas do passageiro
}
```

---

## Fluxo de Implementação no Mobile

### Para o Motorista (Driver)

1. Após criar/consultar uma linha, clique em "Compartilhar convite"
2. Clique em "Gerar link" → recebe a URL do convite
3. Clique em "Copiar link" ou "Compartilhar via..." para enviar ao passageiro

### Para o Passageiro (Passenger)

#### Opção 1: Via Link Web

1. Recebe link via WhatsApp/Email
2. Clica no link → abre o app ou website
3. Se não tem conta → redirecionado para registro
4. Se tem conta → clica "Aceitar convite"
5. Pronto! Agora está na linha

#### Opção 2: Via Token no App

1. Abre o app
2. Vai para "Minhas linhas"
3. Clica em "Entrar em uma linha"
4. Insere o token recebido do motorista
5. Clica "Aceitar"
6. Pronto!

---

## Estrutura de Dados

### Invite (Mock)

```javascript
{
  token: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4",
  lineId: "line-123",
  createdBy: "driver-1",
  createdAt: "2026-05-09T13:26:00.000Z",
  expiresAt: "2026-05-12T13:26:00.000Z"
}
```

### Persistência

- **Modo Mock**: Armazenado em memória em `inviteService.__internal.mockInvites`
- **Produção**: Será salvo em banco de dados relacional (Supabase/PostgreSQL)

---

## Validações

### Ao criar um convite:

- ✅ Motorista deve ser proprietário ou motorista vinculado à linha
- ✅ A linha deve existir
- ✅ Token é gerado com 32 caracteres hexadecimais (seguro)

### Ao aceitar um convite:

- ✅ Token deve existir e não estar expirado
- ✅ Passageiro deve estar autenticado
- ✅ Passageiro não deve já estar vinculado à linha (será apenas adicionado uma vez)

---

## Segurança

- **Tokens únicos**: 32 caracteres hexadecimais (256 bits de entropia)
- **Expiração**: Padrão de 72 horas, configurável
- **Autenticação**: Requer JWT Bearer Token válido
- **Autorização**: Apenas motoristas podem criar, apenas passageiros podem aceitar
- **Rate Limiting**: Será implementado em produção (não no mock)

---

## Casos de Uso

### Caso 1: Passageiro encontrou motorista pelo WhatsApp

1. Motorista negocia via WhatsApp
2. Motorista gera link → envia pelo WhatsApp
3. Passageiro clica no link
4. Se sem conta → register + aceita convite
5. Se com conta → aceita convite
6. ✅ Passageiro agora está na linha

### Caso 2: Passageiro quer se juntar via app

1. Passageiro recebeu token de amigo
2. Abre app → "Entrar em uma linha"
3. Insere token
4. ✅ Passageiro entra na linha

### Caso 3: Motorista quer compartilhar com múltiplos passageiros

1. Motorista cria convite
2. Compartilha o **mesmo link** com múltiplos passageiros
3. Cada passageiro aceita → todos entram na linha

---

## Testes Existentes

### Backend

- `backend/src/__tests__/inviteService.test.js` - Testes unitários do serviço
- `backend/src/__tests__/invite-http.integration.test.js` - Testes HTTP dos endpoints

### Mobile

- Testes de integração: será adicionado após implementar UI

---

## Próximos Passos

1. ✅ Implementar serviço de invites backend (`inviteService.js`)
2. ✅ Implementar rotas HTTP (`lineRoutes.js`)
3. ✅ Adicionar testes (unitários + integração)
4. ⏳ Implementar UI mobile para compartilhar/aceitar convite
5. ⏳ Testar com dispositivo real
6. ⏳ Implementar persistência em banco de dados (Supabase)
