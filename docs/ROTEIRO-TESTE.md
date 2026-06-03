# Roteiro de Testes — FastVan (28 RFs)

## Pré-requisitos
- App instalado no celular (APK) ou Expo Go rodando
- Backend online (Render)
- 2 contas criadas: 1 motorista + 1 passageiro

---

## Etapa 1 — Cadastro e Autenticação (RF1)

**Objetivo:** Validar cadastro e login dos dois perfis.

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 1.1 | Acessar tela inicial → "Criar conta" | Formulário de cadastro |
| 1.2 | Cadastrar motorista (nome, CPF, CNH, email, senha) | Conta criada, redirecionado para home |
| 1.3 | Logout → "Criar conta" → Cadastrar passageiro | Conta passageiro criada |
| 1.4 | Testar login com credenciais erradas | Mensagem de erro |
| 1.5 | Login motorista → verificar home do motorista | Tela correta para cada perfil |

---

## Etapa 2 — Frota e Linhas (RF2 + RF17)

**Logado como: MOTORISTA**

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 2.1 | Aba "Veículo" → "+" → preencher van (placa, modelo, ano, capacidade) | Van aparece na lista |
| 2.2 | Cadastrar segunda van (RF17) | Duas vans listadas |
| 2.3 | Aba "Linhas" → "+" → criar linha (nome, cidade IBGE, destino Google Places, veiculo, horários de ida e volta) | Linha aparece na lista |
| 2.4 | Abrir linha → botão "Mapa" | Mapa vazio (sem pontos ainda) |
| 2.5 | Botão "Adicionar ponto" → buscar endereço via Places → tipo + segmento | Ponto aparece na lista |
| 2.6 | Ver que o mapa agora mostra o ponto cadastrado (RF18) | Marcador no mapa |
| 2.7 | Botão "Ocupação" → verificar dashboard com 0 passageiros | Dashboard vazio |

---

## Etapa 3 — Convite e Entrada na Linha (RF2 + Convites)

**Logado como: MOTORISTA**

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 3.1 | Na linha → "Convidar" → compartilhar link | Link copiado/compartilhado |
| 3.2 | Copiar o token do link | Token disponível |

**Mudar para: PASSAGEIRO**

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 3.3 | Home → "Entrar em uma linha" → colar token | Preview da linha aparece |
| 3.4 | Selecionar horário de ida e volta → "Confirmar entrada" | Entrou na linha, vai para tela de linhas |
| 3.5 | Verificar que linha aparece no dashboard e tela de presença | Linha listada com horário cadastrado |

**Voltar para: MOTORISTA**

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 3.6 | Verificar que linha mostra "1/16 passageiros" | Contagem correta |

---

## Etapa 4 — Confirmação de Presença (RF3 + RF8)

**Logado como: PASSAGEIRO**

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 4.1 | Aba "Linhas" → ver status padrão "Vou e volto" | Status correto |
| 4.2 | Alterar para "Não vou" | Status atualizado com cor vermelha |
| 4.3 | Alterar para "Só vou" | Status atualizado com cor laranja |
| 4.4 | Clicar em "Ir mesmo assim" (RF8 — reversão de ausência) | Confirmação → volta para "Vou e volto" |

---

## Etapa 5 — Troca de Slot (RF6)

**Logado como: PASSAGEIRO**

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 5.1 | Aba "Linhas" → "Trocar horário amanhã" | Modal com slots disponíveis |
| 5.2 | Selecionar horário diferente → "Solicitar" | Status mostra "Horário trocado" ou "Fila de espera" |

---

## Etapa 6 — Ocupação e Alertas (RF4 + RF5)

**Logado como: MOTORISTA**

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 6.1 | Linha → "Ocupação" | Dashboard com slot de ida e volta |
| 6.2 | Ver percentual de ocupação por slot | Números corretos |
| 6.3 | Se ≥80%: verificar badge de alerta amarelo (RF5) | Badge "Crítico" aparece |
| 6.4 | "Decisão do dia" → selecionar "Usar 1 van" | Decisão registrada com badge verde |

---

## Etapa 7 — Geofencing (RF7)

**Logado como: MOTORISTA**

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 7.1 | Linha → "Operar" | Tela de operação com pontos da rota |
| 7.2 | "Iniciar rota de hoje" | GPS ativa, status "AO VIVO" |
| 7.3 | "Registrar chegada" no ponto ativo | Check-in registrado, próximo ponto destacado |
| 7.4 | Botão ⚠️ → registrar ocorrência "Trânsito lento" (RF23) | Log salvo com hora e GPS |
| 7.5 | Após todos os pontos → "Rota concluída" | Estado de conclusão |

---

## Etapa 8 — Passageiro Não Embarcou (RF25)

**Logado como: MOTORISTA (durante operação)**

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 8.1 | No ponto ativo → ver passageiros esperados | Lista de passageiros confirmados |
| 8.2 | Clicar "Não embarcou" em um passageiro | Log registrado, passageiro riscado na lista |

---

## Etapa 9 — Painel de Decisão (RF9)

**Logado como: MOTORISTA**

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 9.1 | Linha → "Ocupação" → painel de decisão | Sugestão automática baseada na ocupação |
| 9.2 | Selecionar "Acionar 2ª van (Uber/99)" | Decisão salva, badge "Decisão registrada" |

---

## Etapa 10 — Sugestão de Pontos (RF19/20)

**Logado como: PASSAGEIRO**

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 10.1 | Dashboard → "Sugerir ponto" | Tela com busca Google Places |
| 10.2 | Buscar endereço → selecionar → tipo + segmento → "Enviar" | Sugestão enviada |

**Logado como: MOTORISTA**

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 10.3 | Linha → "Sugestões" | Lista com sugestão pendente |
| 10.4 | "Aprovar" | Ponto criado na linha, sugestão some da lista |

---

## Etapa 11 — Chat e Enquetes (RF13 + RF29)

**Logado como: MOTORISTA**

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 11.1 | Aba "Chat" → linha → "Chat do grupo" | Tela de chat do grupo |
| 11.2 | Enviar mensagem | Mensagem aparece no chat |
| 11.3 | Ícone 📊 → criar enquete (pergunta + 2 opções) | Enquete publicada como mensagem |

**Logado como: PASSAGEIRO**

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 11.4 | Chat → "Grupo" na linha | Mensagem e enquete visíveis |
| 11.5 | Votar na enquete | Barra de progresso atualiza |
| 11.6 | Chat → "Motorista" | Abre chat privado |

---

## Etapa 12 — Avaliação (RF14)

**Logado como: PASSAGEIRO**

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 12.1 | Dashboard → "Avaliar" na linha | Tela com estrelas por critério |
| 12.2 | Dar notas (motorista + veículo) + comentário → "Enviar" | Avaliação registrada |
| 12.3 | Tentar avaliar novamente | Mensagem "já avaliou este mês" |

---

## Etapa 13 — Controle Financeiro (RF24)

**Logado como: MOTORISTA**

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 13.1 | Aba "Ganhos" | Dashboard financeiro do mês |
| 13.2 | "Novo" lançamento → despesa "Combustível" → valor → salvar | Lançamento aparece na lista |
| 13.3 | "Novo" lançamento → receita "Viagem avulsa" → valor → salvar | Lucro líquido atualizado |

---

## Etapa 14 — Dashboard do Motorista (RF15/30)

**Logado como: MOTORISTA**

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 14.1 | Aba "Relatórios" | Dashboard com vans, linhas, passageiros, km |
| 14.2 | Navegar para mês anterior | Dados filtrados por mês |
| 14.3 | Verificar "Relatório de economia" (RF30) | Dias com 1 van e economia estimada |

---

## Etapa 15 — Dashboard do Passageiro (RF26)

**Logado como: PASSAGEIRO**

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 15.1 | Home → "Meu dashboard" | Resumo de linhas, confirmados, ausências |
| 15.2 | Ver próximas viagens com botões de presença | Pode alterar status diretamente |
| 15.3 | Ver histórico dos últimos 7 dias | Badges coloridos por status |
| 15.4 | Verificar badge de mensalidade (RF24) | "Em dia" ou "Pendente" |

---

## Etapa 16 — Marketplace (RF10/11 + RF12/27)

**Logado como: PASSAGEIRO**

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 16.1 | Home → "Eventos e viagens" → "Criar" | Modal de nova demanda de evento |
| 16.2 | Preencher evento (nome, data, cidade, local, amigos) → "Publicar" | Demanda aparece na lista |
| 16.3 | Home → "Marketplace B2B" → "Publicar" → criar solicitação empresarial | Solicitação publicada |

**Logado como: MOTORISTA**

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 16.4 | Home → "Eventos esporádicos" | Lista de demandas de passageiros |
| 16.5 | "Oferecer transporte" em uma demanda | Abre chat com o criador |
| 16.6 | Home → "Marketplace B2B" | Lista de solicitações empresariais abertas |
| 16.7 | "Tenho interesse" em uma solicitação | Abre chat com a empresa |

---

## Etapa 17 — Mapa da Rota (RF18 + RF22)

**Logado como: MOTORISTA**

| Passo | Ação | Resultado esperado |
|-------|------|--------------------|
| 17.1 | Linha → "Mapa" | Mapa com marcadores dos pontos |
| 17.2 | Ver polilinha laranja (ida) e azul (volta) | Rota visual correta |
| 17.3 | Verificar painel de distância e tempo (RF22) | "Ida: X km · Y min" |
| 17.4 | Tocar em um marcador | Card com endereço e tipo do ponto |

---

## Checklist Final

| Etapa | RF(s) cobertos | ✅/❌ |
|-------|---------------|------|
| 1 | RF1 | |
| 2 | RF2, RF17 | |
| 3 | RF2, Convites | |
| 4 | RF3, RF8 | |
| 5 | RF6 | |
| 6 | RF4, RF5, RF9 | |
| 7 | RF7, RF23 | |
| 8 | RF25 | |
| 9 | RF9 | |
| 10 | RF19, RF20 | |
| 11 | RF13, RF29 | |
| 12 | RF14 | |
| 13 | RF24 | |
| 14 | RF15, RF30 | |
| 15 | RF26 | |
| 16 | RF10, RF11, RF12, RF27 | |
| 17 | RF18, RF22 | |
