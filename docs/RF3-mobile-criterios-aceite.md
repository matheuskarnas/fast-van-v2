# RF3 Mobile: Confirmacao de Presenca do Passageiro

## Objetivo da Entrega

Fechar o fluxo de presenca no app do passageiro para que as regras ja implementadas no backend (RF3) fiquem utilizaveis no produto.

Este documento detalha criterios de aceite apenas da camada mobile e integracao API para a fase atual.

## Escopo da Fase

- Tela de passageiro para listar linhas em que participa.
- Exibicao do status atual por data da proxima viagem.
- Alteracao de presenca para os 4 estados previstos no RF3.
- Tratamento de erros de negocio com mensagens claras.
- Atualizacao visual imediata apos sucesso.

## Fora de Escopo nesta Fase

- Notificacoes push.
- Modo offline com fila de sincronizacao.
- RF6 e RF8.
- Redesign completo de navegacao.

## Regras Funcionais Obrigatorias

1. Apenas passageiro autenticado pode alterar sua presenca.
2. O app deve permitir escolher um dos 4 estados:
   - vai_e_volta
   - nao_vai_nem_volta
   - so_vai
   - so_volta
3. O app deve exibir claramente a data alvo da alteracao.
4. O app deve atualizar a tela apos salvar sem exigir reinicio do app.
5. O app deve exibir erro amigavel quando backend bloquear por prazo encerrado.
6. O app deve exibir erro amigavel quando usuario nao tiver vinculo com a linha.

## Criterios de Aceite (Given/When/Then)

### CA-MOB-RF3-01: Listagem de linhas do passageiro

Given passageiro autenticado
When abre o fluxo de linhas/presenca
Then visualiza as linhas em que esta vinculado
And cada item mostra identificador basico da linha e a proxima data

### CA-MOB-RF3-02: Exibir estado atual de presenca

Given passageiro autenticado com linha valida
When abre detalhes da linha para uma data
Then visualiza seu estado atual de presenca para aquela data

### CA-MOB-RF3-03: Alterar para ausencia total

Given passageiro autenticado antes do horario limite
When seleciona nao_vai_nem_volta e confirma
Then app envia requisicao para API
And recebe sucesso
And atualiza status na tela imediatamente
And exibe feedback de sucesso

### CA-MOB-RF3-04: Alterar para so ida

Given passageiro autenticado antes do horario limite
When seleciona so_vai e confirma
Then app persiste o status com sucesso
And atualiza estado visual sem reload completo da sessao

### CA-MOB-RF3-05: Alterar para so volta

Given passageiro autenticado antes do horario limite
When seleciona so_volta e confirma
Then app persiste o status com sucesso
And atualiza estado visual sem reload completo da sessao

### CA-MOB-RF3-06: Alterar para vai e volta

Given passageiro autenticado antes do horario limite
When seleciona vai_e_volta e confirma
Then app persiste o status com sucesso
And atualiza estado visual sem reload completo da sessao

### CA-MOB-RF3-07: Erro de prazo encerrado

Given passageiro autenticado apos horario limite
When tenta alterar presenca
Then app exibe mensagem clara de prazo encerrado
And mantem estado anterior exibido

### CA-MOB-RF3-08: Erro de autorizacao de linha

Given passageiro sem vinculo na linha
When tenta alterar presenca
Then app exibe mensagem de permissao/vinculo
And nao altera estado local da linha

### CA-MOB-RF3-09: Erro de conexao

Given passageiro autenticado
When ha falha de rede ao salvar
Then app exibe mensagem de falha de conexao
And nao altera estado local de forma otimista definitiva
And permite nova tentativa

## Requisitos de UX

1. Mensagens devem ser orientadas a acao e sem ambiguidades.
2. Estados de carregamento devem desabilitar botao de confirmacao.
3. Botao de acao deve usar tokens de tema, sem cor estatica.
4. A tela deve funcionar em Android e iOS.

## Definicao de Pronto (DoD)

1. Todos os criterios CA-MOB-RF3-01 a CA-MOB-RF3-09 validados.
2. Testes da camada de servico mobile cobrindo sucesso e erros principais.
3. Sem erro de lint no mobile.
4. README atualizado com status da entrega apos merge.
