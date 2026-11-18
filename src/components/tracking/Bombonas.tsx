import { useState } from "react";
import { Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import Download from "lucide-react-native/icons/download";
import MapPin from "lucide-react-native/icons/map-pin";
import Plus from "lucide-react-native/icons/plus";
import QrCode from "lucide-react-native/icons/qr-code";
import Search from "lucide-react-native/icons/search";
import QRCode from "react-native-qrcode-svg";
import { DEPOSITO_DEMO } from "@/data/demo/geo";
import { exportarCsv } from "@/lib/exportarCsv";
import { formatarBateria, formatarCoordenada, formatarData, formatarDataHora, formatarDataIso, formatarLitros, formatarNumero } from "@/lib/format";
import { codigoBombona, coordenadas, FABRICANTE_RASTREADOR, MODELO_RASTREADOR, QR_PREFIXO, validarBombona, type DadosBombona, type EventoOperacional } from "@/services/tracking/model";
import { movimentarProducao, salvarBombonaProducao } from "@/services/tracking/repository";
import { ROTULOS_STATUS_BOMBONA, ROTULOS_STATUS_RASTREADOR, ROTULOS_TIPO_MOVIMENTACAO, type Bombona, type StatusBombona } from "@/types/tracking";
import type { Executar } from "./actions";
import Alertas from "./Alertas";
import Historico from "./Historico";
import { focar } from "./mapa";
import MapaBase from "./MapaBase";
import { DadosPosicao } from "./Rastreamento";
import { Botao, Campo, Cartao, cor, Dado, Escolha, estilo, Janela, normalizar, opcoes, Paginas, Tag, Titulo } from "./ui";
import type { Painel } from "./usePainel";

export function ListaBombonas({ painel, abrir, nova, scan, executar, cliente, caminhao }: {
  painel: Painel; abrir: (id: string) => void; nova?: () => void; scan?: () => void;
  executar: Executar; cliente?: string; caminhao?: string;
}) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"" | StatusBombona>("");
  const [pagina, setPagina] = useState(0);
  const { estado } = painel;
  const rastreadores = new Map(estado.rastreadores.map(r => [r.id, r]));
  const posicoes = new Map(painel.posicoes.map(p => [p.bombonaId, p]));
  const clientes = new Map(estado.clientes.map(c => [c.id, c.nome]));
  const frota = new Map(estado.caminhoes.map(c => [c.id, c.identificacao]));
  const filtradas = estado.bombonas.filter(b => (!cliente || b.clienteId === cliente) && (!caminhao || b.caminhaoId === caminhao) &&
    (!filtro || b.status === filtro) && [b.codigo, b.numeroIdentificacao, rastreadores.get(b.rastreadorId)?.codigo ?? ""].some(t => normalizar(t).includes(normalizar(busca))));
  const indice = Math.min(pagina, Math.max(0, Math.ceil(filtradas.length / 25) - 1));
  return <>
    {nova && <Titulo titulo="Bombonas" nota="Consulte cadastros, vínculos, dispositivos e etiquetas.">
      <View style={estilo.linha}>{scan && <Botao icon={QrCode} onPress={scan}>Ler QR Code</Botao>}
        <Botao icon={Plus} variante="principal" onPress={nova}>Cadastrar bombona</Botao></View>
    </Titulo>}
    <Cartao>
      <View style={[estilo.linha, { alignItems: "flex-end" }]}>
        <View style={{ flex: 2, minWidth: 180 }}><Campo rotulo="Buscar bombona" placeholder="Código, identificação ou rastreador"
          value={busca} onChangeText={v => { setBusca(v); setPagina(0); }} /></View>
        <View style={{ flex: 1, minWidth: 140 }}><Escolha rotulo="Status operacional" valor={filtro} escolher={v => { setFiltro(v); setPagina(0); }}
          itens={[{ value: "", label: "Todos os status" }, ...opcoes(ROTULOS_STATUS_BOMBONA)]} /></View>
        <Botao icon={Download} desabilitado={!filtradas.length} onPress={() => executar(() => exportarCsv("biooleo-bombonas.csv",
          ["Código", "Identificação", "Capacidade (L)", "Modelo", "Status", "Cliente", "Caminhão", "Rastreador", "Número de série", "Data de instalação"],
          filtradas.map(b => [b.codigo, b.numeroIdentificacao, formatarNumero(b.capacidadeLitros, 2), b.modelo, ROTULOS_STATUS_BOMBONA[b.status],
            clientes.get(b.clienteId ?? "") ?? "", frota.get(b.caminhaoId ?? "") ?? "", rastreadores.get(b.rastreadorId)?.codigo ?? "",
            rastreadores.get(b.rastreadorId)?.serial ?? "", formatarDataIso(b.dataInstalacao)])), "Cadastros exportados em CSV.")}>Exportar cadastros</Botao>
      </View>
      <Text style={estilo.nota}>{formatarNumero(filtradas.length)} {filtradas.length === 1 ? "bombona encontrada" : "bombonas encontradas"}</Text>
      {filtradas.slice(indice * 25, (indice + 1) * 25).map(b => {
        const p = posicoes.get(b.id);
        const local = clientes.get(b.clienteId ?? "") ?? frota.get(b.caminhaoId ?? "") ?? ROTULOS_STATUS_BOMBONA[b.status];
        return <View key={b.id} style={[estilo.espalhar, estilo.divisoria]}>
          <View style={{ flex: 1, minWidth: 140 }}><Text style={estilo.rotulo}>{b.codigo}</Text><Text style={estilo.nota}>{b.modelo} · {formatarLitros(b.capacidadeLitros)} · {local}</Text></View>
          <Tag texto={p ? ROTULOS_STATUS_RASTREADOR[p.statusComunicacao] : "Sem rastreador"} tom={p?.statusComunicacao === "online" ? "verde" : "ambar"} />
          <Botao onPress={() => abrir(b.id)}>{`Ver ${b.codigo}`}</Botao>
        </View>;
      })}
      <Paginas pagina={indice} temMais={(indice + 1) * 25 < filtradas.length} anterior={() => setPagina(indice - 1)} proxima={() => setPagina(indice + 1)} />
    </Cartao>
  </>;
}

export function FormBombona({ painel, existente, abrir, cancelar, executar, ocupado }: {
  painel: Painel; existente?: Bombona; abrir: (id: string) => void; cancelar: () => void; executar: Executar; ocupado: boolean;
}) {
  const { estado, demo } = painel;
  const r = estado.rastreadores.find(item => item.id === existente?.rastreadorId);
  const [status, setStatus] = useState<StatusBombona>(existente?.status ?? "no_deposito");
  const [cliente, setCliente] = useState(existente?.clienteId ?? "");
  const [caminhao, setCaminhao] = useState(existente?.caminhaoId ?? "");
  const proximo = painel.simulacao?.proximoCodigo;
  const sufixo = proximo ? codigoBombona(proximo).slice(4) : "";
  const [campos, setCampos] = useState({
    identificacao: existente?.numeroIdentificacao ?? sufixo,
    capacidade: existente ? String(existente.capacidadeLitros).replace(".", ",") : "50", modelo: existente?.modelo ?? "Bombona PEAD",
    latitude: existente ? formatarCoordenada(existente.latitude) : demo ? formatarCoordenada(DEPOSITO_DEMO.latitude) : "",
    longitude: existente ? formatarCoordenada(existente.longitude) : demo ? formatarCoordenada(DEPOSITO_DEMO.longitude) : "",
    codigoR: r?.codigo ?? (sufixo ? `VE-${sufixo}` : ""), serial: r?.serial ?? (sufixo ? `DEMO-SL-${sufixo}` : ""),
    instalacao: existente ? formatarDataIso(existente.dataInstalacao) : formatarData(estado.agora), observacoes: existente?.observacoes ?? "",
  });
  function mudar<K extends keyof typeof campos>(chave: K, texto: string) { setCampos(c => ({ ...c, [chave]: texto })); }
  function local(id: string, tipo: "cliente" | "caminhao") {
    if (tipo === "cliente") setCliente(id); else setCaminhao(id);
    const p = (tipo === "cliente" ? estado.clientes : estado.caminhoes).find(item => item.id === id);
    if (p) setCampos(c => ({ ...c, latitude: String(p.latitude).replace(".", ","), longitude: String(p.longitude).replace(".", ",") }));
  }
  function salvar() {
    executar(async () => {
      const data = /^\d{2}\/\d{2}\/\d{4}$/.test(campos.instalacao.trim()) ? campos.instalacao.trim().split("/").reverse().join("-") : "";
      const dados: DadosBombona = {
        numeroIdentificacao: campos.identificacao.trim(), capacidadeLitros: coordenadas(campos.capacidade), modelo: campos.modelo.trim(),
        status, clienteId: status === "em_transporte" ? null : cliente || null,
        caminhaoId: status === "em_transporte" ? caminhao || null : null,
        latitude: coordenadas(campos.latitude), longitude: coordenadas(campos.longitude),
        codigoRastreador: campos.codigoR.trim().toUpperCase(), serial: campos.serial.trim().toUpperCase(),
        dataInstalacao: data, observacoes: campos.observacoes.trim() || null,
      };
      validarBombona(dados, estado, existente?.id);
      const id = demo ? demo.salvarBombona(dados, existente?.id) : await salvarBombonaProducao(dados, existente?.id);
      if (demo) await painel.persistir(); else await painel.recarregar();
      abrir(id);
    }, existente ? "Alterações salvas." : "Bombona cadastrada. O QR Code está disponível nos detalhes.");
  }
  const camposPrincipais = [
    ["identificacao", "Número de identificação"], ["capacidade", "Capacidade (L)"], ["modelo", "Tipo ou modelo"],
    ["latitude", "Latitude inicial"], ["longitude", "Longitude inicial"], ["instalacao", "Data de instalação (DD/MM/AAAA)"],
    ["codigoR", "Código do rastreador"], ["serial", "Número de série do rastreador"],
  ] as const;
  return <>
    <Titulo titulo={existente ? "Editar bombona" : "Cadastrar bombona"} nota={`Rastreador associado: ${FABRICANTE_RASTREADOR} ${MODELO_RASTREADOR}`} />
    <Cartao>
      <View style={estilo.linha}><Dado rotulo="Código da bombona" valor={existente?.codigo ?? (proximo ? codigoBombona(proximo) : "Gerado ao salvar")} /></View>
      <View style={estilo.linha}>
        <View style={{ flex: 1, minWidth: 155 }}><Escolha rotulo="Status operacional" valor={status} escolher={setStatus} itens={opcoes(ROTULOS_STATUS_BOMBONA)} /></View>
        {status !== "em_transporte" && <View style={{ flex: 1, minWidth: 160 }}><Escolha rotulo="Cliente associado" valor={cliente} escolher={id => local(id, "cliente")} itens={[
          { value: "", label: "Sem cliente vinculado" }, ...estado.clientes.filter(c => c.status === "ativo").map(c => ({ value: c.id, label: c.nome })),
        ]} /></View>}
        {status === "em_transporte" && <View style={{ flex: 1, minWidth: 160 }}><Escolha rotulo="Caminhão associado" valor={caminhao} escolher={id => local(id, "caminhao")}
          itens={estado.caminhoes.filter(c => c.status !== "manutencao").map(c => ({ value: c.id, label: c.identificacao }))} /></View>}
      </View>
      <View style={[estilo.linha, { alignItems: "stretch" }]}>
        {camposPrincipais.map(([chave, rotulo]) => <View key={chave} style={{ flexBasis: 225, flexGrow: 1, flexShrink: 1 }}>
          <Campo rotulo={rotulo} value={campos[chave]} onChangeText={texto => mudar(chave, texto)}
            keyboardType={chave === "capacidade" ? "decimal-pad" : "default"} autoCapitalize={chave === "serial" || chave === "codigoR" ? "characters" : "sentences"} /></View>)}
      </View>
      <Campo rotulo="Observações" value={campos.observacoes} onChangeText={texto => mudar("observacoes", texto)} multiline />
      <View style={estilo.linha}><Botao variante="principal" desabilitado={ocupado} onPress={salvar}>Salvar bombona</Botao><Botao onPress={cancelar}>Cancelar</Botao></View>
    </Cartao>
  </>;
}

type Aba = "Informações gerais" | "Localização" | "Histórico" | "Dispositivo GPS" | "Movimentações" | "Alertas";
export function DetalhesBombona({ b, painel, abrir, editar, voltar, mapa, executar, ocupado }: {
  b: Bombona; painel: Painel; abrir: (id: string) => void; editar: () => void; voltar: () => void; mapa: () => void; executar: Executar; ocupado: boolean;
}) {
  const [aba, setAba] = useState<Aba>("Informações gerais");
  const [excluir, setExcluir] = useState(false);
  const [registrar, setRegistrar] = useState(false);
  const p = painel.posicoes.find(item => item.bombonaId === b.id);
  const r = painel.estado.rastreadores.find(item => item.id === b.rastreadorId);
  const local = painel.estado.clientes.find(c => c.id === b.clienteId)?.endereco
    ?? painel.estado.caminhoes.find(c => c.id === b.caminhaoId)?.identificacao ?? ROTULOS_STATUS_BOMBONA[b.status];
  const abas: Aba[] = ["Informações gerais", "Localização", "Histórico", "Dispositivo GPS", "Movimentações", "Alertas"];
  return <>
    <Titulo titulo={b.codigo} nota={`${b.modelo} · ${formatarLitros(b.capacidadeLitros)}`}>
      <View style={estilo.linha}><Botao onPress={voltar}>Voltar às bombonas</Botao><Botao onPress={editar}>Editar</Botao>
        <Botao variante="perigo" onPress={() => setExcluir(true)}>Excluir</Botao></View>
    </Titulo>
    <View style={estilo.linha}>{abas.map(item => <Botao key={item} variante={aba === item ? "principal" : "secundario"} onPress={() => setAba(item)}>{item}</Botao>)}</View>
    {aba === "Informações gerais" && <Cartao>
      <View style={estilo.linha}><Dado rotulo="Número de identificação" valor={b.numeroIdentificacao} />
        <Dado rotulo="Status operacional" valor={ROTULOS_STATUS_BOMBONA[b.status]} /><Dado rotulo="Instalação" valor={formatarDataIso(b.dataInstalacao)} />
        <Dado rotulo="Local operacional" valor={local} /><Dado rotulo="Observações" valor={b.observacoes ?? "—"} /></View>
      <Text style={estilo.subtitulo}>QR Code da bombona</Text>
      <View style={{ padding: 10, alignSelf: "flex-start", backgroundColor: "#fff" }}>
        <QRCode value={QR_PREFIXO + b.qrCode} size={142} quietZone={9} />
      </View>
      <View style={estilo.linha}><Botao icon={QrCode} variante="principal" onPress={() => setRegistrar(true)}>Registrar movimentação</Botao>
        <Botao icon={MapPin} onPress={mapa}>Localizar no mapa</Botao></View>
    </Cartao>}
    {aba === "Localização" && <Cartao>{p ? <>
      <DadosPosicao p={p} local={local} />
      <MapaBase altura={310} regiao={focar(p)} selecionar={() => {}} marcadores={[{ ...p, id: b.id, titulo: b.codigo, cor: cor.primaryMedium }]} />
      <View style={estilo.linha}><Botao onPress={mapa}>Abrir mapa GPS</Botao></View>
    </> : <Text style={estilo.nota}>Sem posição disponível.</Text>}</Cartao>}
    {aba === "Dispositivo GPS" && <Cartao><View style={estilo.linha}>
      <Dado rotulo="Fabricante" valor={r?.fabricante ?? "—"} /><Dado rotulo="Modelo" valor={r?.modelo ?? "—"} />
      <Dado rotulo="Código" valor={r?.codigo ?? "—"} /><Dado rotulo="Número de série" valor={r?.serial ?? "—"} />
      <Dado rotulo="Bateria" valor={formatarBateria(r?.bateriaPercentual)} /><Dado rotulo="Última transmissão" valor={formatarDataHora(r?.ultimaComunicacao)} />
      <Dado rotulo="Comunicação" valor={p ? ROTULOS_STATUS_RASTREADOR[p.statusComunicacao] : "—"} /><Dado rotulo="Conexão" valor={r?.tipoConexao ?? "—"} />
    </View></Cartao>}
    {(aba === "Histórico" || aba === "Movimentações") && <>
      {aba === "Movimentações" && <View style={estilo.linha}><Botao onPress={() => setRegistrar(true)}>Registrar movimentação</Botao></View>}
      <Historico key={aba} painel={painel} bombona={b.id} inicial={aba === "Histórico" ? "posicoes" : "movimentos"} abrir={abrir} executar={executar} embutido />
    </>}
    {aba === "Alertas" && <Alertas painel={painel} bombona={b.id} abrir={abrir} executar={executar} />}
    <Janela aberta={excluir} titulo={`Excluir ${b.codigo}?`} fechar={() => setExcluir(false)}>
      <Text style={estilo.texto}>A bombona será removida da lista e do mapa. As movimentações registradas ficam disponíveis no histórico.</Text>
      <Botao variante="perigo" desabilitado={ocupado} onPress={() => executar(async () => {
        if (painel.demo) { painel.demo.excluirBombona(b.id); await painel.persistir(); }
        else { await movimentarProducao(b.id, "exclusao"); await painel.recarregar(); }
        setExcluir(false); voltar();
      }, "Bombona excluída.")}>Confirmar exclusão</Botao>
    </Janela>
    {registrar && <Movimentar painel={painel} b={b} fechar={() => setRegistrar(false)} executar={executar} ocupado={ocupado} />}
  </>;
}

const EVENTOS: EventoOperacional[] = ["entrega_cliente", "retirada_caminhao", "entrada_deposito", "saida_deposito", "inspecao", "manutencao"];
export function Movimentar({ painel, b, fechar, executar, ocupado, destinoInicial, eventoInicial }: {
  painel: Painel; b: Bombona; fechar: () => void; executar: Executar; ocupado: boolean; destinoInicial?: string; eventoInicial?: EventoOperacional;
}) {
  const [tipo, setTipo] = useState<EventoOperacional>(eventoInicial ?? "inspecao");
  const [destino, setDestino] = useState(destinoInicial ?? "");
  const entrega = tipo === "entrega_cliente";
  const precisaDestino = entrega || tipo === "retirada_caminhao" || tipo === "saida_deposito";
  return <Janela aberta titulo={`Movimentação · ${b.codigo}`} fechar={fechar}>
    <Escolha embutida rotulo="Tipo de movimentação" valor={tipo} escolher={v => { setTipo(v); setDestino(""); }}
      itens={EVENTOS.map(value => ({ value, label: ROTULOS_TIPO_MOVIMENTACAO[value] }))} />
    {precisaDestino && <Escolha embutida rotulo={entrega ? "Cliente de destino" : "Caminhão"} valor={destino} escolher={setDestino} itens={entrega
      ? painel.estado.clientes.filter(c => c.status === "ativo").map(c => ({ value: c.id, label: c.nome }))
      : painel.estado.caminhoes.filter(c => c.status !== "manutencao").map(c => ({ value: c.id, label: c.identificacao }))} />}
    <Botao variante="principal" desabilitado={ocupado || (precisaDestino && !destino)} onPress={() => executar(async () => {
      if (painel.demo) { painel.demo.movimentar(b.id, tipo, destino); await painel.persistir(); }
      else { await movimentarProducao(b.id, tipo, destino); await painel.recarregar(); }
      fechar();
    }, "Movimentação registrada.")}>Confirmar movimentação</Botao>
  </Janela>;
}

export function LeitorBombona({ painel, abrir }: { painel: Painel; abrir: (id: string) => void }) {
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState("");
  const [camera, setCamera] = useState(false);
  const [perm, pedir] = useCameraPermissions();
  function ler(texto: string) {
    const qr = texto.trim().startsWith(QR_PREFIXO) ? texto.trim().slice(QR_PREFIXO.length) : texto.trim();
    const b = painel.estado.bombonas.find(item => item.qrCode === qr || item.codigo === qr.toUpperCase());
    setCamera(false);
    if (b) abrir(b.id); else setErro("O QR Code ou código não corresponde a uma bombona deste ambiente.");
  }
  return <>
    <Titulo titulo="Ler QR Code" nota="Use a câmera ou informe o código para abrir os detalhes da bombona." />
    <Cartao>
      {camera && <CameraView style={{ height: 290 }} barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={({ data }) => ler(data)}
        onMountError={() => { setCamera(false); setErro("Não foi possível iniciar a câmera."); }} />}
      <View style={estilo.linha}><Botao icon={QrCode} onPress={() => {
        if (camera) { setCamera(false); return; }
        void (perm?.granted ? Promise.resolve(perm) : pedir()).then(p => {
          if (p.granted) { setErro(""); setCamera(true); } else setErro("Permita o acesso à câmera para ler a etiqueta.");
        }, () => setErro("Não foi possível acessar a câmera."));
      }}>{camera ? "Fechar câmera" : "Abrir câmera"}</Botao></View>
      <Campo rotulo="Código da bombona ou conteúdo do QR Code" value={valor} onChangeText={setValor} onSubmitEditing={() => ler(valor)} />
      {!!erro && <Text accessibilityRole="alert" style={{ color: cor.critical }}>{erro}</Text>}
      <View style={estilo.linha}><Botao icon={Search} onPress={() => ler(valor)}>Consultar bombona</Botao></View>
    </Cartao>
  </>;
}
