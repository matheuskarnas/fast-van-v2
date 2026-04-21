# FastVan - Monorepo

Aplicativo para facilitar o dia a dia de passageiros e motoristas de vans.

## Estado Atual do Projeto

Última atualização: abril/2026

- Backend com cobertura de RF1, RF2, RF3, RF4, RF5, RF7 e RF13.
- Mobile com autenticação, navegação por perfil, gestão de veículos, chat e fluxo de geofencing.
- Qualidade atual validada:
	- Backend lint: passando
	- Backend testes: 10 suítes, 159 testes passando
	- Mobile lint: passando

## Funcionalidades (MVP)

| RF | Nome | Status Atual | Prioridade |
| --- | --- | --- | --- |
| 1 | Cadastro de Usuários | ✅ Implementado (backend + mobile + testes) | Alta |
| 2 | Cadastro e Gerenciamento de Rotas | ✅ Implementado no backend, mobile parcial | Alta |
| 3 | Confirmação de Presença pelo Aluno | ✅ Implementado no backend, mobile parcial | Alta |
| 4 | Ocupação da Van em Tempo Real | ✅ Backend implementado e testado, sem dashboard dedicado no mobile | Média |
| 5 | Alerta de Lotação Crítica | ✅ Backend implementado e testado, tela mobile ainda placeholder | Média |
| 6 | Lista de Espera e Chamada de Van Extra | ⏳ Não implementado | Média |
| 7 | Check-in por Geofencing | ✅ Implementado (backend + integração HTTP + tela mobile) | Média |
| 8 | Registro de Ausência de Última Hora | ⏳ Não implementado | Baixa |
| 13 | Chat Integrado Aluno/Motorista | ✅ Implementado (backend + integração HTTP + telas mobile) | Alta |

## Estrutura do Projeto

```text
fast-van-v2/
├── backend/                     # API Node.js/Express
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── __tests__/          # RF1, RF2, RF3, RF4, RF5, RF7, RF13
│   ├── .eslintrc.json
│   └── package.json
├── mobile/                      # App React Native + Expo
│   ├── app/
│   ├── components/
│   ├── constants/
│   ├── hooks/
│   ├── services/
│   └── package.json
├── docs/                        # Critérios de aceite por RF
└── README.md
```

## Como Iniciar

### Setup único

```bash
npm run install:all
```

### Backend

```bash
cd backend
npm run lint
npm test
npm run dev
```

### Mobile

```bash
cd mobile
npm run lint
npm start
```

## Scripts úteis (raiz)

```bash
npm run backend:test
npm run backend:test:coverage
npm run backend:dev
npm run mobile:start
npm run mobile:android
npm run mobile:web
```

## Documentação dos Requisitos

- RF1: [docs/RF1-criterios-aceite.md](docs/RF1-criterios-aceite.md)
- RF2: [docs/RF2-criterios-aceite.md](docs/RF2-criterios-aceite.md)
- RF3: [docs/RF3-criterios-aceite.md](docs/RF3-criterios-aceite.md)
- RF4: [docs/RF4-criterios-aceite.md](docs/RF4-criterios-aceite.md)
- RF5: [docs/RF5-criterios-aceite.md](docs/RF5-criterios-aceite.md)
- RF7: [docs/RF7-criterios-aceite.md](docs/RF7-criterios-aceite.md)
- RF13: [docs/RF13-criterios-aceite.md](docs/RF13-criterios-aceite.md)
- RF3 Mobile (fase passageiro): [docs/RF3-mobile-criterios-aceite.md](docs/RF3-mobile-criterios-aceite.md)

## Variáveis de Ambiente

### Backend (.env)

```env
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/fastvan
JWT_SECRET=seu-secret-aqui
USE_MOCK_DB=true
```

### Mobile (.env)

```env
EXPO_PUBLIC_API_URL=http://localhost:3001
EXPO_PUBLIC_ENV=development
```

## Próximas Entregas Recomendadas

1. Fechar frontend de RF5 (tela de alertas com dados reais).
2. Consolidar frontend de RF3/RF4 (presença e ocupação em visão operacional).
3. Definir escopo e critérios de aceite para RF6 e RF8 antes de implementação.
4. Rodar smoke test fim a fim (cadastro, login, veículos, chat, geofencing).
