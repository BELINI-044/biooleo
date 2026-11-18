# BioOleo Brasil

Painel administrativo de gestão e rastreamento de bombonas em Expo SDK 58, React Native, TypeScript e Expo Router. O aplicativo também mantém os fluxos operacionais existentes de despacho, etiquetas, troca por QR Code e devolução.

## Abrir a demonstração

    npm ci
    EXPO_PUBLIC_DEMO_MODE=true npx expo start --web

Para abrir no celular, execute `EXPO_PUBLIC_DEMO_MODE=true npx expo start` e use um cliente Expo compatível com o SDK 58. Também é possível colocar `EXPO_PUBLIC_DEMO_MODE=true` no `.env` antes de iniciar o Metro. O acesso local usa o botão **Entrar na demonstração** e dispensa configuração do Supabase.

1. No **Painel geral**, confira as 3.000 bombonas, sendo 1.500 no depósito, 1.320 em clientes e 180 em transporte.
2. Clique em **Iniciar simulação**. O relógio da demonstração avança 30 minutos a cada 12 segundos. Abra **Mapa GPS** para localizar uma bombona pelo código, aproximar os agrupamentos e acompanhar os dois caminhões.
3. Em **Cadastrar bombona**, confira o código gerado, informe os dados operacionais e salve. Os detalhes exibem a etiqueta QR Code, o dispositivo e o mapa. Use **Ler QR Code** para abrir a etiqueta pela câmera ou pelo código.
4. Em **Clientes** ou **Caminhões**, selecione um registro e use as ações de entrega, associação e descarga. Os mesmos eventos podem ser registrados em **Movimentações** nos detalhes da bombona.
5. Em **Configurações**, teste perda de comunicação, recuperação e bateria baixa. O alerta de perda de comunicação exige mais de 60 minutos no relógio simulado. Use **Pausar simulação** para congelar as transmissões automáticas.
6. Em **Histórico**, escolha posições ou movimentações, filtre os registros e exporte a página em CSV. A demonstração mantém as oito janelas de transmissão mais recentes e até 96 pontos por rota. Os cadastros, movimentações, alertas e o estado do simulador persistem no dispositivo via AsyncStorage.
7. **Reiniciar dados da demonstração** restaura a base inicial após confirmação.

As localizações são fictícias. Os pontos de referência, os clientes e as rotas podem ser ajustados em [geo.ts](src/data/demo/geo.ts) e [seed.ts](src/data/demo/seed.ts). O aplicativo usa React Native Maps no Android e iOS. No navegador, o mapa interativo usa Leaflet e OpenStreetMap. O mapa-base depende de acesso à rede. Use `EXPO_PUBLIC_MAPA_WEB_URL` e `EXPO_PUBLIC_MAPA_WEB_ATRIBUICAO` para configurar outro provedor cartográfico. Em builds Android próprios, configure `GOOGLE_MAPS_ANDROID_API_KEY` e `BIOOLEO_ANDROID_PACKAGE` com a chave do Maps SDK e o identificador do seu aplicativo. A abertura direta do QR pela câmera externa requer um build que registre o esquema `biooleo://`. A leitura interna também oferece busca manual por código.

## Configurar o Supabase

1. No projeto Supabase que contém as tabelas operacionais existentes, revise as migrations. Aplique-as em uma instância de homologação primeiro e depois no projeto de destino com a CLI da Supabase (`supabase link --project-ref <referência>` e `supabase db push`), ou com o SQL Editor na ordem dos arquivos. [Migrations](supabase/migrations)
2. Configure `EXPO_PUBLIC_DEMO_MODE=false`, `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` no `.env`. Use a chave publicável do projeto.
3. Crie ou selecione uma conta de Auth e confirme que o registro existente `public.profiles` tem o mesmo ID da conta, `role='admin'` e `is_active=true`. A autenticação e as políticas RLS do rastreamento usam esse perfil. Em um projeto novo, a primeira migration cria o esquema mínimo de perfis. Cadastre o perfil pelo SQL Editor após criar a conta de Auth:

       insert into public.profiles(id, full_name, role)
       values ('<id da conta de Auth>', 'Administrador BioOleo', 'admin');

    A tabela `usuarios` está disponível para dados cadastrais da integração.
4. Entre com o e-mail e a senha do administrador. Em **Configurações**, preencha as coordenadas verificadas do depósito. A opção **Operações existentes** mantém o acesso às telas conectadas às tabelas anteriores. As migrations adicionam um cadastro de rastreamento próprio. Para vincular ativos operacionais já cadastrados, planeje a importação ou associação com base nos IDs e códigos verificados no banco de destino.
5. O bucket privado `relatorios-biooleo` recebe somente relatórios CSV arquivados por ação explícita do administrador. A política de acesso restringe a leitura ao diretório daquele usuário.

As tabelas de telemetria são independentes do modo demonstração. Para as 144.000 posições/dia previstas, o histórico usa índice por bombona e horário e cursor por horário e ID. São consultadas no máximo 51 linhas por solicitação, incluindo a verificação da próxima página. A visão de posição atual obtém apenas a leitura mais recente por ativo. Os gráficos consultam agregações no banco.

A política de retenção de produção preserva 90 dias de posições, aproximadamente 13 milhões de linhas na capacidade prevista. Após homologar o volume, configure uma tarefa de backend ou Supabase Cron para chamar `tracking_purgar_posicoes()` a cada hora. Cada execução remove até 20.000 linhas antigas. Monitore a idade do registro mais antigo, o volume e o autovacuum. Agende `tracking_verificar_sinal()` a cada 15 minutos para gerar alertas de mais de 60 minutos sem transmissão. As duas funções são reservadas ao backend. Para horizontes maiores, arquive antes da purga e avalie particionamento por período.

## Integração com Vision Telematics

O simulador implementa `TrackingProvider`. O adaptador `VisionTrackingProvider` identifica o ponto de entrada da integração oficial. A interface de produção lê as posições normalizadas do Supabase e pode receber a integração sem alterar as telas.

Para ativar o adaptador no servidor, obtenha da Vision Telematics:

- Endereço oficial, método de autenticação e credenciais com escopo de leitura.
- Identificador e unidade de provisionamento de cada Barra Edge SL-0001-PT para associar ao código/serial cadastrado.
- Campos de horário, coordenadas, precisão, velocidade e bateria, com as unidades e a referência geográfica.
- Frequência suportada e forma de recebimento por webhook autenticado ou consulta periódica, incluindo limites, paginação e política de retentativas.
- Documentação do sensor de remoção, se oferecido pelo dispositivo e pelo contrato ativo.

Guarde as credenciais no servidor. Após validar e normalizar os eventos, envie posições reais para `tracking_receber_posicao` e rotas para `tracking_receber_rota` com uma credencial de backend. A ingestão desduplica transmissões e preserva a leitura mais recente diante de mensagens atrasadas. Passe o indicador de remoção somente quando o sensor oficial reportar esse evento. Valide associação, coordenadas, atraso, erro de autenticação e perda/recuperação de sinal antes da produção.

## Verificações locais

    npx expo lint
    npx tsc --noEmit
    EXPO_PUBLIC_DEMO_MODE=true npx expo export --platform all

Documentação de referência do [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/), [React Native Maps](https://docs.expo.dev/versions/v58.0.0/sdk/map-view/) e [políticas RLS do Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).
