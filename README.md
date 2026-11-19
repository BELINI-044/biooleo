# BioOleo — Gestão e rastreamento de bombonas

Aplicativo administrativo da BioOleo para gerenciar bombonas de óleo usado, clientes, caminhões, movimentações, histórico de localização e alertas operacionais.

O projeto utiliza Expo SDK 58, React Native, TypeScript e Expo Router. A demonstração funciona sem rastreadores físicos e sem credenciais do Supabase: 3.000 bombonas e seus dispositivos são gerados localmente e identificados como dados simulados.

## Início rápido da demonstração

Requisitos:

- Node.js compatível com o Expo SDK 58;
- npm;
- Google Chrome, Firefox, Edge ou Safari atualizado;
- conexão com a internet para carregar o mapa-base no navegador.

Instale as dependências e inicie a versão web na porta 8081:

```bash
npm ci
EXPO_PUBLIC_DEMO_MODE=true npx expo start --web --port 8081 --clear
```

Acesse [http://localhost:8081](http://localhost:8081) e selecione **Entrar na demonstração**. O modo demonstração não exige e-mail ou senha.

> A simulação começa pausada. Selecione **Iniciar simulação** no topo do painel ou em **Configurações** para iniciar as atualizações automáticas.

No PowerShell, use:

```powershell
$env:EXPO_PUBLIC_DEMO_MODE="true"
npx expo start --web --port 8081 --clear
```

## Roteiro sugerido para apresentação

Este roteiro leva aproximadamente cinco minutos:

1. Entre na demonstração e apresente o **Painel geral**, com os indicadores calculados a partir dos registros: 3.000 bombonas, comunicação dos rastreadores, distribuição operacional e alertas.
2. Selecione **Iniciar simulação**. Cada ciclo de 12 segundos representa uma transmissão operacional de 30 minutos.
3. Abra **Mapa GPS**, pesquise `BIO-000001`, selecione a bombona e mostre sua posição, bateria, comunicação, precisão e última atualização.
4. Abra **Bombonas** e consulte os detalhes da mesma bombona. Mostre o QR Code, o rastreador Vision Barra Edge e as abas de localização, histórico, movimentações e alertas.
5. Selecione **Cadastrar bombona**. O formulário já sugere o próximo código, coordenadas do depósito e identificadores exclusivos. Ao salvar, a bombona passa a aparecer na lista e no mapa.
6. Mostre **Clientes** e **Caminhões**, incluindo as bombonas vinculadas e as rotas simuladas dos dois veículos.
7. Em **Configurações**, execute **Simular bateria baixa** ou **Simular perda de comunicação**. Depois abra **Alertas** para mostrar as ocorrências simuladas.
8. Abra **Histórico**, alterne entre tabela e mapa e demonstre a exportação CSV.
9. Recarregue a página para comprovar que os cadastros e as alterações continuam salvos localmente.

## Cenário da demonstração

- 3.000 bombonas identificadas de `BIO-000001` a `BIO-003000`;
- 3.000 rastreadores simulados Vision Telematics Barra Edge SL-0001-PT;
- 1.500 bombonas no depósito;
- 1.320 bombonas em clientes;
- 180 bombonas em transporte;
- dois caminhões com rotas simuladas;
- clientes e restaurantes fictícios em locais configuráveis do Paraná;
- dispositivos conectados, sem comunicação e com bateria baixa;
- atualização visual a cada 12 segundos, equivalente a 30 minutos operacionais;
- dados, posições e alertas claramente identificados como demonstração.

As coordenadas não representam a posição real de ativos da BioOleo.

## Funcionalidades

### Painel administrativo

- indicadores operacionais calculados a partir da base atual;
- gráficos de distribuição, movimentações, comunicação e alertas;
- últimas movimentações;
- menu lateral no desktop e navegação adaptada em telas menores.

### Mapa GPS

- 3.000 posições individuais com agrupamento visual;
- pesquisa por código ou identificação;
- filtros por situação, comunicação, cliente, caminhão e alertas;
- diferenciação entre posição atualizada, desatualizada, aproximada e sem comunicação;
- centralização do mapa e aproximação automática da bombona selecionada;
- dois caminhões com deslocamento simulado.

No Android e no iOS o aplicativo utiliza React Native Maps. Na web utiliza Leaflet e OpenStreetMap por padrão.

### Cadastros e operação

- cadastro, edição, consulta e exclusão de bombonas;
- validação de códigos, números de identificação, dispositivos e números de série duplicados;
- QR Code exclusivo sem exposição de dados sensíveis;
- consulta manual do QR Code e leitura pela câmera em ambiente compatível;
- cadastro e edição de clientes;
- consulta e edição dos dois caminhões da demonstração;
- associação de bombonas a clientes e caminhões;
- registro de entrega, retirada, entrada, saída, inspeção e manutenção;
- confirmação antes de exclusões e reinício dos dados.

### Histórico e alertas

- histórico individual de posições e movimentações;
- filtros por bombona, cliente, período e tipo;
- visualização em tabela e mapa;
- paginação e exportação CSV com cabeçalhos em português;
- alertas de comunicação, bateria, movimentação inesperada, área geográfica e entrada ou saída do depósito;
- estados pendente, visualizado e resolvido.

## Persistência da demonstração

O estado da demonstração é armazenado por AsyncStorage. No navegador, o armazenamento local preserva:

- bombonas e rastreadores cadastrados ou editados;
- clientes;
- vínculos e movimentações;
- posições e rotas recentes;
- alertas;
- estado e ciclo do simulador.

Para restaurar a base inicial, abra **Configurações**, selecione **Reiniciar dados da demonstração** e confirme a operação.

Dados simulados e dados reais usam fluxos separados. O aplicativo não combina os dois ambientes.

## Estrutura principal

```text
src/
├── app/                          # Rotas e telas do Expo Router
├── components/tracking/          # Painel, mapa, cadastros, histórico e alertas
├── config/                       # Variáveis e comportamento do ambiente
├── data/demo/                    # Base e coordenadas fictícias da demonstração
├── lib/                          # Formatação pt-BR, CNPJ, CSV e Supabase
├── services/tracking/
│   ├── MockTrackingProvider.ts   # Motor funcional da demonstração
│   ├── VisionTrackingProvider.ts # Adaptador reservado à integração oficial
│   ├── demoStorage.ts            # Persistência local
│   ├── model.ts                  # Validação e modelo de dados
│   ├── repository.ts             # Acesso paginado ao Supabase
│   └── types.ts                  # Contrato independente do fornecedor
└── types/                        # Tipos do domínio de rastreamento

supabase/migrations/              # Estrutura, RLS, telemetria e relatórios
```

As telas consomem o contrato `TrackingProvider`. O simulador e a futura integração com a Vision Telematics ficam isolados, permitindo substituir a fonte da telemetria sem reescrever a interface.

## Variáveis de ambiente

Copie `.env.example` para `.env` e ajuste o ambiente desejado:

```env
EXPO_PUBLIC_DEMO_MODE=true
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

GOOGLE_MAPS_ANDROID_API_KEY=
BIOOLEO_ANDROID_PACKAGE=

# Opcionais para outro mapa-base web
# EXPO_PUBLIC_MAPA_WEB_URL=
# EXPO_PUBLIC_MAPA_WEB_ATRIBUICAO=
```

Use `EXPO_PUBLIC_DEMO_MODE=true` para apresentação e `false` para o ambiente conectado ao Supabase.

Nunca adicione a chave de serviço do Supabase ao aplicativo. Somente a chave pública deve ser exposta por variável `EXPO_PUBLIC_*`.

## Configuração do Supabase

1. Crie um projeto de homologação no Supabase.
2. Configure `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. Aplique as migrations na ordem apresentada em `supabase/migrations`:
   - `20261118000100_rastreamento.sql`;
   - `20261118000200_operacoes_rastreamento.sql`;
   - `20261118000300_telemetria_e_relatorios.sql`.
4. Crie uma conta no Supabase Auth.
5. Confirme que `public.profiles` possui um registro ativo com o mesmo ID e perfil administrativo:

```sql
insert into public.profiles (id, full_name, role)
values ('<id da conta de Auth>', 'Administrador BioOleo', 'admin');
```

6. Inicie o aplicativo com `EXPO_PUBLIC_DEMO_MODE=false` e entre com o e-mail e a senha do administrador.

As migrations preservam as tabelas operacionais existentes, adicionam constraints, índices e políticas RLS e disponibilizam consultas paginadas para o histórico.

### Retenção de telemetria

O volume previsto pode chegar a 144.000 posições por dia. A implementação:

- consulta o histórico em páginas de até 50 itens;
- usa cursor por horário e ID;
- obtém a posição atual sem carregar todo o histórico;
- possui índices por ativo e horário;
- prevê retenção de 90 dias;
- disponibiliza `tracking_purgar_posicoes()` para remoção controlada em lotes;
- disponibiliza `tracking_verificar_sinal()` para gerar alertas de ausência de transmissão.

Antes da produção, agende essas funções no backend ou pelo Supabase Cron e monitore o volume, o autovacuum e o registro mais antigo.

## Integração futura com a Vision Telematics

O projeto não inventa endpoints, credenciais ou formatos da Vision Telematics. `VisionTrackingProvider` permanece indisponível até a entrega da documentação oficial.

Para conectar os rastreadores físicos ainda serão necessários:

- endereço oficial da API;
- método de autenticação e credenciais de servidor;
- identificador oficial de cada Barra Edge SL-0001-PT;
- formato dos eventos, coordenadas, horários, precisão, velocidade e bateria;
- frequência de transmissão;
- definição de webhook ou consulta periódica;
- limites, paginação, retentativas e tratamento de erros;
- documentação de sensores adicionais, inclusive eventual detecção de remoção;
- processo de provisionamento e associação entre serial, rastreador e bombona.

As credenciais devem permanecer no servidor. O backend deve validar, normalizar e sincronizar a telemetria com o Supabase antes que o aplicativo a consulte.

## Comandos de desenvolvimento

```bash
# Servidor de desenvolvimento
npx expo start

# Demonstração web na porta usada na apresentação
EXPO_PUBLIC_DEMO_MODE=true npx expo start --web --port 8081 --clear

# Qualidade e compatibilidade
npx tsc --noEmit
npx expo lint
npx expo-doctor
npx expo install --check

# Verificação dos bundles
EXPO_PUBLIC_DEMO_MODE=true npx expo export --platform all

# Build de desenvolvimento na nuvem
npx eas-cli@latest build --profile development
```

## Solução de problemas na apresentação

### A porta 8081 já está em uso

Encerre o servidor Expo anterior com `Ctrl+C` e execute novamente o comando de início. Evite manter mais de um Metro Bundler aberto para este projeto.

### A página mostra uma versão antiga

Use `Ctrl+Shift+R` no navegador. Se necessário, reinicie com `--clear`.

Ao fechar ou recarregar uma aba durante uma resposta do servidor, o terminal de desenvolvimento pode registrar `This operation was aborted`. Essa mensagem indica que o navegador cancelou a requisição; confirme que `http://localhost:8081` continua respondendo antes de reiniciar o Expo.

<<<<<<< HEAD
=======
### A entrada pula diretamente para o painel

Isso indica que a autorização da demonstração foi preservada no armazenamento local. É o comportamento esperado. Para voltar à tela inicial, selecione **Sair**.

### O mapa-base não aparece

Confirme a conexão com a internet e se o provedor do mapa-base está acessível. As posições são geradas localmente, mas os blocos cartográficos da versão web dependem do provedor configurado.

O empacotador também pode avisar que alguns ícones locais do CSS do Leaflet não são suportados. O painel usa marcadores próprios e não depende desses ícones padrão; o aviso não impede o mapa nem a exportação do projeto.

### A câmera não abre no navegador

Permita o acesso à câmera. Navegadores exigem contexto seguro, como `localhost` ou HTTPS. A consulta manual pelo código da bombona continua disponível.

### Quero começar a apresentação do zero

Abra **Configurações** e use **Reiniciar dados da demonstração**. Em seguida, deixe a simulação pausada até o momento de apresentá-la.

## Verificação executada

Os fluxos abaixo foram validados no modo demonstração:

- entrada e painel geral;
- mapa, pesquisa e seleção de bombona;
- cadastro da bombona `BIO-003001` e consulta pelo QR Code;
- cadastro e consulta de cliente;
- detalhes dos caminhões;
- histórico em tabela e mapa;
- início, pausa e retomada do simulador;
- geração e exibição de alertas;
- persistência após recarregar a página;
- navegação responsiva em largura móvel;
- renderização web sem falha de hidratação.

## Licença

Consulte o arquivo [LICENSE](LICENSE).
>>>>>>> 67a0247 (feat: prepara demonstracao BioOleo)
