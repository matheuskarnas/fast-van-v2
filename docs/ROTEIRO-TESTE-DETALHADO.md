# Roteiro de Teste Detalhado — FastVan

## Pré-requisitos

- Backend rodando: `cd backend && npm run dev`
- App no celular via Expo Go (QR Code) ou build instalado
- Celular e backend na mesma rede Wi-Fi
- Duas abas/sessões disponíveis (ou dois celulares)

---

## FASE 1 — Configuração Inicial

### 1.1 Criar conta de Motorista

1. Abrir o app
2. Tocar em **"Criar conta"**
3. Selecionar perfil **"Motorista"**
4. Preencher:
   - Nome: `João Motorista`
   - CPF: `303.850.130-19`
   - CNH: `12345678901`
   - Data de nascimento: `01/01/1990`
   - Email: `joao@motorista.com`
   - Senha: `Teste@123`
5. Tocar em **"Cadastrar"**
6. ✅ Deve ir para a home do motorista

### 1.2 Criar conta de Passageiro

1. Fazer logout (ou usar outro dispositivo/aba)
2. Tocar em **"Criar conta"** → **"Passageiro"**
3. Preencher:
   - Nome: `Ana Passageira`
   - CPF: `224.169.050-31`
   - Data de nascimento: `15/06/1995`
   - Email: `ana@passageira.com`
   - Senha: `Teste@123`
4. ✅ Deve ir para a home do passageiro

---

## FASE 2 — Frota e Linha (RF1, RF2, RF17)

**Logado como: MOTORISTA**

### 2.1 Cadastrar Van

1. Tocar na aba **"Veículo"** (ícone de carro)
2. Tocar no **"+"** (botão laranja)
3. Preencher:
   - Placa: `ABC-1235`
   - Modelo: `Sprinter`
   - Ano: `2020`
   - Capacidade: `16`
4. Tocar em **"Cadastrar"**
5. ✅ Van aparece na lista com nome, capacidade e "Sem linha associada"

### 2.2 Criar Linha

1. Tocar na aba **"Linhas"** (ícone de mapa)
2. Tocar no **"+"** (botão laranja)
3. Preencher:
   - Nome: `Fatec Manhã`
   - Cidade de origem: digitar `Caçapava` → selecionar da lista IBGE
   - Destino: digitar `Fatec São José` → selecionar da sugestão do Google Places
   - Veículo: selecionar a Sprinter cadastrada
   - Horário de ida: tocar em **"+ Adicionar"** → selecionar `07:10` → confirmar
   - Horário de volta: tocar em **"+ Adicionar"** → selecionar `12:35` → confirmar
4. Tocar em **"Criar linha"**
5. ✅ Linha aparece na lista com `0/16 lugares`

### 2.3 Adicionar Ponto de Embarque

1. Tocar na linha "Fatec Manhã"
2. Tocar em **"Ponto"**
3. Buscar endereço: `Praça João Pessoa, Caçapava`
4. Selecionar o resultado do Google Places
5. Segmento: **Ida e Volta**
6. Tocar em **"Salvar"**
7. ✅ Ponto aparece na lista da linha

---

## FASE 3 — Convite e Entrada na Linha (RF2, Convites)

**Logado como: MOTORISTA**

### 3.1 Gerar Convite

1. Na linha "Fatec Manhã" → tocar em **"Convidar"**
2. ✅ Compartilhar tela aparece com o link `fastvanmobile://invite/TOKEN`
3. **Copiar o TOKEN** (parte após `/invite/`)

**Mudar para: PASSAGEIRO**

### 3.2 Aceitar Convite

1. Na home → tocar em **"Entrar em uma linha"**
2. Colar o token copiado
3. Tocar na lupa (🔍) para buscar
4. ✅ Preview da linha aparece: nome, rota, capacidade
5. Selecionar horário de ida: **07:10**
6. Selecionar horário de volta: **12:35**
7. Tocar em **"Confirmar entrada na linha"**
8. ✅ Mensagem "Sucesso!" → redirecionado para "Confirmar presença"

**Voltar para: MOTORISTA**

### 3.3 Verificar Passageiro na Linha

1. Linha "Fatec Manhã" deve mostrar **1/16**
2. ✅ Dashboard de ocupação deve mostrar slot `07:10: 1/16 (6%)`

---

## FASE 4 — Confirmação de Presença (RF3)

**Logado como: PASSAGEIRO**

### 4.1 Marcar Ausência

1. Aba **"Linhas"** (ou "Confirmar presença" na home)
2. Linha "Fatec Manhã" → horário aparece como badge `Ida 07:10 • Volta 12:35`
3. Status padrão: **"Vou e volto"** (verde)
4. Tocar em **"Não vou"**
5. ✅ Status muda para vermelho

### 4.2 Marcar Só Volta

1. Tocar em **"Só volto"**
2. ✅ Status muda para azul marinho

### 4.3 Restaurar Presença (RF8 — Ausência de Última Hora)

1. O botão **"Ir mesmo assim"** aparece em verde (destaque)
2. Tocar nele
3. ✅ Alerta: "Você havia marcado ausência. Confirma que vai embarcar hoje?"
4. Tocar **"Sim, vou embarcar"**
5. ✅ Volta para "Vou e volto"

---

## FASE 5 — Troca de Slot (RF6)

**Logado como: PASSAGEIRO**

### 5.1 Solicitar Horário Diferente

1. Na aba "Linhas" → linha "Fatec Manhã"
2. Tocar em **"Trocar horário amanhã"** (botão azul marinho)
3. Modal aparece: "Seu horário fixo: 07:10"
4. Selecionar o slot alternativo disponível
5. Tocar **"Solicitar"**
6. ✅ Mensagem: "Troca confirmada!" ou "Você entrou na fila de espera"
7. Badge de slot atualiza com o novo horário

---

## FASE 6 — Dashboard de Ocupação e Alertas (RF4, RF5)

**Logado como: MOTORISTA**

### 6.1 Ver Dashboard

1. Linha "Fatec Manhã" → tocar em **"Ocupação"**
2. ✅ Mostra: `Saída 07:10: 1/16 (6%)` com badge verde "Normal"
3. Painel **"Decisão do dia"** mostra sugestão "1 van"

### 6.2 Registrar Decisão (RF9)

1. No painel de decisão → tocar em **"Usar 1 van"**
2. ✅ Badge "Decisão registrada" aparece em verde

---

## FASE 7 — Operação de Rota (RF7)

**Logado como: MOTORISTA**

### 7.1 Iniciar Rota

1. Linha "Fatec Manhã" → tocar em **"Operar"**
2. ✅ Lista os pontos cadastrados
3. Tocar em **"Iniciar rota de hoje"**
4. ✅ Permissão de GPS solicitada → aceitar
5. Header mostra badge vermelho **"AO VIVO"**

### 7.2 Registrar Check-in

1. Tocar em **"Registrar chegada"** no ponto ativo
2. ✅ Ponto marcado como concluído (check verde)

### 7.3 Registrar Ocorrência (RF23)

1. Tocar no botão ⚠️ no header
2. Selecionar **"Trânsito lento"**
3. Adicionar nota: "Congestionamento na Dutra"
4. Tocar **"Registrar"**
5. ✅ "Ocorrência registrada"

### 7.4 Passageiro Não Embarcou (RF25)

1. No ponto ativo → ver lista de passageiros esperados
2. Tocar em **"Não embarcou"** ao lado do passageiro
3. ✅ Passageiro riscado, log registrado

---

## FASE 8 — Sugestão de Pontos (RF19/20)

**Logado como: PASSAGEIRO**

### 8.1 Sugerir Novo Ponto

1. Home → **"Meu dashboard"** → linha "Fatec Manhã"
2. Tocar em **"Sugerir ponto"**
3. Digitar endereço na busca: `Rua XV de Novembro, Caçapava`
4. Selecionar o resultado
5. Tipo: **Embarque** | Segmento: **Ida**
6. Tocar **"Enviar sugestão"**
7. ✅ "Sugestão enviada! O motorista irá analisar."

**Logado como: MOTORISTA**

### 8.2 Aprovar Sugestão

1. Linha "Fatec Manhã" → tocar em **"Sugestões"** (badge amarelo)
2. ✅ Sugestão de "Ana Passageira" aparece
3. Tocar **"Aprovar"**
4. ✅ "Ponto aprovado!" — ponto adicionado à linha

---

## FASE 9 — Chat e Enquetes (RF13, RF29)

**Logado como: MOTORISTA**

### 9.1 Acessar Chat do Grupo

1. Aba **"Chat"** → linha "Fatec Manhã" → tocar
2. ✅ Chat do grupo abre
3. Enviar mensagem: "Bom dia pessoal!"
4. ✅ Mensagem aparece

### 9.2 Criar Enquete (RF29)

1. Tocar no ícone 📊 no header do chat
2. Pergunta: "Podemos sair 30min mais cedo na sexta?"
3. Opção 1: "Sim, pode!"
4. Opção 2: "Não consigo"
5. Tocar **"Criar enquete"**
6. ✅ Enquete aparece no chat como mensagem especial

**Logado como: PASSAGEIRO**

### 9.3 Votar na Enquete

1. Aba "Chat" → linha → "Grupo"
2. ✅ Ver mensagem e enquete
3. Tocar em **"Sim, pode!"**
4. ✅ Barra de progresso atualiza para 100%

### 9.4 Chat com Motorista

1. Aba "Chat" → linha → **"Motorista"**
2. ✅ Chat privado abre
3. Enviar mensagem: "Chego em 5 minutos!"

---

## FASE 10 — Avaliação (RF14)

**Logado como: PASSAGEIRO**

### 10.1 Avaliar Viagem

1. Home → **"Meu dashboard"** → **"Avaliar"** na linha
2. Preencher estrelas:
   - Pontualidade: ⭐⭐⭐⭐⭐
   - Direção: ⭐⭐⭐⭐
   - Simpatia: ⭐⭐⭐⭐⭐
   - Conforto: ⭐⭐⭐⭐
   - Qualidade: ⭐⭐⭐⭐⭐
   - Higiene: ⭐⭐⭐⭐⭐
3. Comentário: "Ótimo motorista, sempre pontual!"
4. Tocar **"Enviar avaliação"**
5. ✅ "Avaliação enviada!"
6. Tentar avaliar novamente → ✅ Erro "já avaliou este mês"

---

## FASE 11 — Controle Financeiro (RF24)

**Logado como: MOTORISTA**

### 11.1 Registrar Despesa

1. Aba **"Ganhos"**
2. Tocar em **"Novo"**
3. Tipo: **Despesa** | Categoria: **Combustível**
4. Descrição: "Abastecimento posto Shell"
5. Valor: `250`
6. Tocar **"Salvar"**
7. ✅ Lançamento aparece na lista

### 11.2 Registrar Receita Extra

1. **"Novo"** → Tipo: **Receita** → Categoria: **Viagem avulsa**
2. Valor: `150`
3. ✅ Lucro líquido atualiza

---

## FASE 12 — Dashboard Analítico (RF15, RF30)

**Logado como: MOTORISTA**

1. Aba **"Relatórios"**
2. ✅ Cards: vans (1), linhas (1), passageiros (1), km estimados
3. ✅ Financeiro: despesas R$250, receita R$150, lucro -R$100
4. ✅ RF30: dias com 1 van, economia estimada
5. Navegar para mês anterior usando **"←"**
6. ✅ Dados mudam (mês sem registros = zerado)

---

## FASE 13 — Dashboard do Passageiro (RF26)

**Logado como: PASSAGEIRO**

1. Home → **"Meu dashboard"**
2. ✅ Cards: 1 linha ativa, confirmados, ausências
3. ✅ "Fatec Manhã" com horário `07:10 / 12:35`
4. ✅ Badge de mensalidade (em dia ou pendente)
5. Próximas viagens com botões de status
6. Histórico dos últimos 7 dias

---

## FASE 14 — Mapa da Rota (RF18, RF22)

**Logado como: MOTORISTA**

1. Linha "Fatec Manhã" → tocar em **"Mapa"**
2. ✅ Marcadores no mapa para os pontos cadastrados
3. ✅ Polilinha laranja conectando pontos de ida
4. Tocar em um marcador → ✅ Card com endereço e tipo
5. ✅ Painel inferior: "Ida: X km · Y min"

---

## FASE 15 — Marketplace (RF10/11, RF12/27)

### 15.1 Evento (RF12)

**Logado como: PASSAGEIRO**

1. Home → **"Eventos e viagens"**
2. Tocar em **"Criar"**
3. Preencher:
   - Evento: `Jogo do Corinthians`
   - Data: `2026-12-15`
   - Início: `16:00` | Fim: `22:00`
   - Cidade: `Caçapava`
   - Local: `Arena Corinthians, São Paulo`
   - Amigos: `3`
4. Tocar **"Publicar"**
5. ✅ Demanda aparece na lista

**Logado como: MOTORISTA**

6. Home → **"Eventos esporádicos"**
7. ✅ Ver demanda do jogo
8. Tocar **"Oferecer transporte"**
9. ✅ Chat privado com o passageiro abre

### 15.2 B2B (RF10)

**Logado como: PASSAGEIRO**

1. Home → **"Marketplace B2B"** → **"Publicar"**
2. Preencher:
   - Destino: `Av. Industrial, 500 - São José dos Campos`
   - Cidade: `Caçapava`
   - Chegada: `09:00` | Saída: `18:00`
   - Funcionários: `15`
3. ✅ Solicitação publicada

**Logado como: MOTORISTA**

4. Home → **"Marketplace B2B"**
5. ✅ Ver solicitação da empresa
6. Tocar **"Tenho interesse"**
7. ✅ Chat abre para negociação

---

## Checklist de Validação Final

| # | RF(s) | Status |
|---|-------|--------|
| 1 | RF1 — Cadastro motorista e passageiro | ⬜ |
| 2 | RF2 — Cadastro van e linha com pontos | ⬜ |
| 3 | RF17 — Frota com linhas associadas | ⬜ |
| 4 | Convites — Entrada com seleção de slot | ⬜ |
| 5 | RF3 — Confirmar/alterar presença | ⬜ |
| 6 | RF8 — Reversão de ausência de última hora | ⬜ |
| 7 | RF6 — Troca de slot + fila de espera | ⬜ |
| 8 | RF4/RF5 — Ocupação por slot + alertas | ⬜ |
| 9 | RF9 — Decisão 1 ou 2 vans | ⬜ |
| 10 | RF7 — Geofencing + check-in | ⬜ |
| 11 | RF23 — Registro de ocorrência | ⬜ |
| 12 | RF25 — Passageiro não embarcou | ⬜ |
| 13 | RF19/20 — Sugestão + aprovação de ponto | ⬜ |
| 14 | RF13 — Chat privado e grupo | ⬜ |
| 15 | RF29 — Enquete no chat | ⬜ |
| 16 | RF14 — Avaliação motorista/veículo | ⬜ |
| 17 | RF24 — Controle financeiro | ⬜ |
| 18 | RF15/30 — Dashboard analítico motorista | ⬜ |
| 19 | RF26 — Dashboard passageiro | ⬜ |
| 20 | RF18 — Mapa dos pontos | ⬜ |
| 21 | RF22 — Distância e tempo da rota | ⬜ |
| 22 | RF12/27 — Marketplace eventos | ⬜ |
| 23 | RF10/11 — Marketplace B2B | ⬜ |
