# BioOleo Brasil

<a href="https://expo.dev">
  <img src="https://expo.dev/assets/icons/expo-icon-192.png" alt="Expo" width="40" valign="middle" hspace="8">
</a>
<span style="font-size:1.25em; vertical-align:middle;"> Painel administrativo de gestão e rastreamento de bombonas</span>

<p align="center">
  <strong>Expo SDK 58 · React Native · TypeScript · Expo Router</strong>
</p>

---

## 🏠 Iniciar a Demonstração

```bash
npm ci
EXPO_PUBLIC_DEMO_MODE=true npx expo start --web
```

### No celular

Execute `EXPO_PUBLIC_DEMO_MODE=true npx expo start` e use um cliente Expo compatível com o SDK 58. Também é possível colocar `EXPO_PUBLIC_DEMO_MODE=true` no `.env` antes de iniciar o Metro.

O acesso local usa o botão **Entrar na demonstração** e dispensa configuração do Supabase.

### 📋 O que fazer na demonstração

1. **Painel geral** — Confira as 3.000 bombonas, sendo 1.500 no depósito, 1.320 em clientes e 180 em transporte.

2. **Iniciar simulação** — O relógio da demonstração avança 30 minutos a cada 12 segundos. Abra **Mapa GPS** para localizar uma bombona pelo código, aproximar os agrupamentos e acompanhar os dois caminhões.

3. **Cadastrar bombona** — Confira o código gerado, informe os dados operacionais e salve. Os detalhes exibem a etiqueta QR Code, o dispositivo e o mapa. Use **Ler QR Code** para abrir a etiquela pela câmera ou pelo código.

4. **Clientes ou Caminhões** — Selecione um registro e use as ações de entrega, associação e descarga. Os mesmos eventos podem ser registrados em **Movimentações** nos detalhes da bombona.

5. **Configurações** — Teste perda de comunicação, recuperação e bateria baixa. O alerta de perda de comunicação exige mais de 60 minutos no relógio simulado. Use **Pausar simulação** para congelar as transmissões automáticas.

6. **Histórico** — Escolha posições ou movimentações, filtre os registros e exporte a página em CSV. A demonstração mantém as oito janelas de transmissão mais recentes e até 96 pontos por rota. Os cadastros, movimentações, alertas e o estado do simulador persistem no dispositivo via AsyncStorage.

7. **Reiniciar dados da demonstração** — Restaura a base inicial após confirmação.

> 📍 As localizações são fictícias. Os pontos de referência, os clientes e as rotas podem ser ajustados em [geo.ts](src/data/demo/geo.ts) e [seed.ts](src/data/demo/seed.ts). O aplicativo usa React Native Maps no Android e iOS. No navegador, o mapa interativo usa Leaflet e OpenStreetMap.

> 🌐 Mapa-base: configure `EXPO_PUBLIC_MAPA_WEB_URL` e `EXPO_PUBLIC_MAPA_WEB_ATRIBUICAO` para outro provedor cartográfico. Em builds Android próprios, configure `GOOGLE_MAPS_ANDROID_API_KEY` e `BIOOLEO_ANDROID_PACKAGE`.

---

## ⚙️ Configurar o Supabase

1. No projeto Supabase que contém as tabelas operacionais existentes, revise as migrations. Aplique-as em uma instância de homologação primeiro e depois no projeto de destino com a CLI da Supabase (`supabase link --project-ref <referência>` e `supabase db push`), ou com o SQL Editor na ordem dos arquivos. Consulte a pasta [supabase/migrations](./supabase/migrations).

2. Configure as variáveis no `.env`:

```env
EXPO_PUBLIC_DEMO_MODE=false
EXPO_PUBLIC_SUPABASE_URL=sua-url-aqui
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sua-chave-aqui
```

3. Crie ou selecione uma conta de Auth e confirme que o registro existente `public.profiles` tem o mesmo ID da conta, `role='admin'` e `is_active=true`. A autenticação e as políticas RLS do rastreamento usam esse perfil.

   ```sql
   insert into public.profiles(id, full_name, role)
   values ('<id da conta de Auth>', 'Administrador BioOleo', 'admin');
   ```

4. Entre com o e-mail e a senha do administrador. Em **Configurações**, preencha as coordenadas verificadas do depósito. A opção **Operações existentes** mantém o acesso às telas conectadas às tabelas anteriores. As migrations adicionam um cadastro de rastreamento próprio. Para vincular ativos operacionais já cadastrados, planeje a importação ou associação com base nos IDs e códigos verificados no banco de destino.

5. O bucket privado `relatorios-biooleo` recebe somente relatórios CSV arquivados por ação explícita do administrador. A política de acesso restringe a leitura ao diretório daquele usuário.

### 📊 Telemetria (produção)

As tabelas de telemetria são independentes do modo demonstração. Para as 144.000 posições/dia previstas:

- O histórico usa índice por bombona e horário e cursor por horário e ID.
- São consultadas no máximo 51 linhas por solicitação, incluindo a verificação da próxima página.
- A visão de posição atual obtém apenas a leitura mais recente por ativo.
- Os gráficos consultam agregações no banco.

**Política de retenção:** preserva 90 dias de posições, aproximadamente 13 milhões de linhas na capacidade prevista. Após homologar o volume, configure uma tarefa de backend ou Supabase Cron para chamar `tracking_purgar_posicoes()` a cada hora. Cada execução remove até 20.000 linhas antigas. Monitore a idade do registro mais antigo, o volume e o autovacuum.

Agende `tracking_verificar_sinal()` a cada 15 minutos para gerar alertas de mais de 60 minutos sem transmissão. As duas funções são reservadas ao backend. Para horizontes maiores, archive antes da purga e avalie particionamento por período.

---

## 🛰️ Integração com Vision Telematics

O simulador implementa `TrackingProvider`. O adaptador `VisionTrackingProvider` identifica o ponto de entrada da integração oficial. A interface de produção lê as posições normalizadas do Supabase e pode receber a integração sem alterar as telas.

### Credenciais necessárias da Vision Telematics

| Campo | Descrição |
|-------|-----------|
| Endereço oficial | URL do endpoint de recebimento |
| Método de autenticação | Tipo de auth (Bearer, HMAC, etc.) |
| Credenciais com escopo de leitura | Chaves/API keys com permissão de leitura |
| Identificador da Barra Edge SL-0001-PT | ID de provisionamento de cada dispositivo |
| Unidade de provisionamento | Número de série associado ao código/serial cadastrado |
| Campos de horário, coordenadas, precisão, velocidade e bateria | Formatos e unidades de medida |
| Frequência suportada | Intervalo de recebimento de eventos |
| Forma de recebimento | Webhook autenticado ou consulta periódica |
| Limites, paginação e política de retentativas | Configurações de controle de fluxo |
| Documentação do sensor de remoção | Caso o dispositivo ofereça esse evento |

### Ingestão de dados

> Guarde as credenciais no servidor. Após validar e normalizar os eventos, envie posições reais para `tracking_receber_posicao` e rotas para `tracking_receber_rota` com uma credencial de backend.

A ingestão desduplica transmissões e preserva a leitura mais recente diante de mensagens atrasadas. Passe o indicador de remoção somente quando o sensor oficial reportar esse evento. Valide:

- Associação do ativo
- Coordenadas dentro do esperado
- Atraso dentro do limite
- Erro de autenticação
- Perda/recuperação de sinal

---

## 🔍 Verificações locais

```bash
npx expo lint
npx tsc --noEmit
EXPO_PUBLIC_DEMO_MODE=true npx expo export --platform all
```

### Referências

- [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/)
- [React Native Maps](https://docs.expo.dev/versions/v58.0.0/sdk/map-view/)
- [Políticas RLS do Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security)

---

## 📦 Disponível também

- **EAS Build** — `eas build --profile development` para builds de desenvolvimento
- **EAS Update** — `eas update` para over-the-air updates
- **Expo Go** — `npx expo start` para testar com o cliente Expo

---

