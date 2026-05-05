# RF4 e RF5 Mobile: Ocupacao e Alertas do Motorista

## Objetivo da Entrega

Fechar no mobile a visao operacional do motorista para:
- RF4: ocupacao em tempo real da proxima viagem
- RF5: alertas de lotacao critica e capacidade excedida

Este documento cobre criterios de aceite da camada mobile e integracao API na fase atual.

## Escopo da Fase

- Tela mobile de dashboard operacional para motorista.
- Exibicao de ocupacao por trecho (ida/volta) da proxima data.
- Exibicao de alertas por trecho quando >= 80% e > 100%.
- Atualizacao manual e atualizacao por evento live quando disponivel.
- Tratamento de erros de autorizacao, regra de data e linha inexistente.

## Fora de Escopo nesta Fase

- Notificacoes push fora do app.
- Graficos avancados e historico multi-data.
- Otimizacao de desempenho para listas extensas.
- RF6 e RF8.

## Regras Funcionais Obrigatorias

1. Apenas motorista dono ou motorista atrelado pode acessar dashboard de ocupacao/alertas.
2. Consulta deve usar a proxima data da linha.
3. O app deve exibir ocupacao separada por ida e volta.
4. Percentual deve ser exibido como inteiro.
5. Alertas devem seguir regras:
   - Critico: percentual >= 80 e <= 100
   - Excedido: percentual > 100
6. Passageiro e motorista sem vinculo devem receber bloqueio com mensagem clara.
7. Em erro de rede, o app deve exibir mensagem amigavel e opcao de tentar novamente.

## Criterios de Aceite RF4 (Mobile)

### CA-MOB-RF4-01: Carregar ocupacao da proxima data
Given motorista autorizado
When abre o dashboard da linha
Then visualiza a ocupacao da proxima data
And visualiza confirmados e percentual por trecho

### CA-MOB-RF4-02: Exibir blocos separados por trecho
Given resposta valida da API
When dados sao renderizados
Then o app exibe bloco de ida e bloco de volta
And cada bloco mostra lista de confirmados daquele trecho

### CA-MOB-RF4-03: Percentual inteiro
Given taxa de ocupacao calculada
When percentual e exibido
Then valor aparece sem casas decimais

### CA-MOB-RF4-04: Atualizacao do dashboard
Given dashboard aberto
When usuario aciona atualizar
Then o app recarrega dados da API
And substitui os indicadores na tela sem reiniciar sessao

### CA-MOB-RF4-05: Erro de autorizacao
Given passageiro ou motorista nao vinculado
When tenta acessar dashboard
Then app exibe mensagem de permissao
And nao renderiza dados sensiveis da linha

### CA-MOB-RF4-06: Erro de data invalida/regra da proxima data
Given requisicao com data fora da regra
When API retorna bloqueio
Then app exibe mensagem explicando restricao de consulta

### CA-MOB-RF4-07: Linha inexistente
Given lineId invalido
When app consulta ocupacao
Then app exibe erro de linha nao encontrada

## Criterios de Aceite RF5 (Mobile)

### CA-MOB-RF5-01: Exibir alerta critico (>=80%)
Given ocupacao de um trecho atinge 80% ou mais
When dashboard e carregado
Then app exibe badge/estado de alerta critico para o trecho

### CA-MOB-RF5-02: Exibir alerta de excedido (>100%)
Given ocupacao de um trecho excede 100%
When dashboard e carregado
Then app exibe estado de capacidade excedida para o trecho

### CA-MOB-RF5-03: Alertas por trecho
Given ida e volta com percentuais diferentes
When dashboard e renderizado
Then app mostra nivel de alerta individual para ida e para volta

### CA-MOB-RF5-04: Sem alerta abaixo de 80%
Given ocupacao abaixo de 80%
When dashboard e renderizado
Then app nao exibe alerta critico/excedido para o trecho

### CA-MOB-RF5-05: Atualizacao de alerta apos refresh
Given dashboard com alerta atual
When usuario atualiza e percentual muda
Then app atualiza nivel do alerta sem inconsistencias visuais

### CA-MOB-RF5-06: Erro de rede no painel de alertas
Given falha de conexao durante consulta
When app nao recebe resposta
Then exibe mensagem de falha de conexao
And disponibiliza acao de nova tentativa

## Requisitos de UX

1. Dashboard deve indicar estado de carregamento inicial.
2. Acao de atualizar deve ficar desabilitada durante requisicao em andamento.
3. Cores e componentes devem usar tokens de tema, sem cor estatica.
4. Mensagens de erro devem ser descritivas e orientadas a acao.
5. Layout deve manter legibilidade em telas menores.

## Definicao de Pronto (DoD)

1. Todos os criterios CA-MOB-RF4-01 a CA-MOB-RF4-07 validados.
2. Todos os criterios CA-MOB-RF5-01 a CA-MOB-RF5-06 validados.
3. Testes de servico e tela cobrindo sucesso e erros principais.
4. Lint mobile sem erros.
5. README atualizado com status da entrega apos merge.
