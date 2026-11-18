import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import Plus from "lucide-react-native/icons/plus";
import { formatarCnpj, limparCnpj } from "@/lib/cnpj";
import { exportarCsv } from "@/lib/exportarCsv";
import { formatarCoordenada, formatarDataHora, formatarNumero } from "@/lib/format";
import { coordenadas, validarCliente, validarCoordenadas, type EventoOperacional, type PontoRota } from "@/services/tracking/model";
import { carregarRota, salvarCaminhaoProducao, salvarClienteProducao } from "@/services/tracking/repository";
import { ROTULOS_STATUS_CAMINHAO, ROTULOS_STATUS_CLIENTE, type Bombona, type Caminhao, type Cliente } from "@/types/tracking";
import type { Executar } from "./actions";
import { ListaBombonas, Movimentar } from "./Bombonas";
import Historico from "./Historico";
import { enquadrar, focar } from "./mapa";
import MapaBase from "./MapaBase";
import { Botao, Campo, Cartao, cor, Dado, Escolha, estilo, Janela, normalizar, opcoes, Paginas, Tag, Titulo } from "./ui";
import type { Painel } from "./usePainel";

type Props = { painel: Painel; executar: Executar; ocupado: boolean; abrirBombona: (id: string) => void };
type Nav = { id?: string; editando: boolean; abrir: (id?: string, editar?: boolean) => void };

function Coordenadas({ latitude, longitude, lat, lng }: { latitude: string; longitude: string; lat: (v: string) => void; lng: (v: string) => void }) {
  return <View style={estilo.linha}>
    <View style={{ flex: 1, minWidth: 120 }}><Campo rotulo="Latitude" value={latitude} onChangeText={lat} /></View>
    <View style={{ flex: 1, minWidth: 120 }}><Campo rotulo="Longitude" value={longitude} onChangeText={lng} /></View>
  </View>;
}
function Vincular({ painel, executar, ocupado, destino, evento, fechar }: {
  painel: Painel; executar: Executar; ocupado: boolean; destino?: string; evento: EventoOperacional; fechar: () => void;
}) {
  const [busca, setBusca] = useState("");
  const [b, setB] = useState<Bombona>();
  if (b) return <Movimentar painel={painel} b={b} fechar={fechar} executar={executar} ocupado={ocupado} destinoInicial={destino} eventoInicial={evento} />;
  const itens = painel.estado.bombonas.filter(item => normalizar(item.codigo).includes(normalizar(busca)) &&
    (evento === "entrada_deposito" ? item.caminhaoId === destino : evento === "entrega_cliente" ? item.clienteId !== destino : item.caminhaoId !== destino)).slice(0, 8);
  return <Janela aberta titulo="Selecionar bombona" fechar={fechar}>
    <Campo rotulo="Código da bombona" placeholder="BIO-000001" value={busca} onChangeText={setBusca} />
    {itens.length ? <View style={estilo.linha}>{itens.map(item => <Botao key={item.id} onPress={() => setB(item)}>{item.codigo}</Botao>)}</View>
      : <Text style={estilo.nota}>Nenhuma bombona encontrada.</Text>}
  </Janela>;
}
export function Clientes({ painel, id, editando, abrir, executar, ocupado, abrirBombona }: Props & Nav) {
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(0);
  const [vincular, setVincular] = useState(false);
  const { estado } = painel;
  const c = estado.clientes.find(item => item.id === id);
  if (editando) return <FormCliente key={id ?? "novo"} c={c} painel={painel} executar={executar} ocupado={ocupado} abrir={abrir} />;
  if (c) {
    const ult = estado.movimentacoes.find(m => m.clienteId === c.id);
    const vinculadas = estado.bombonas.filter(b => b.clienteId === c.id).length;
    const noLocal = estado.bombonas.filter(b => b.clienteId === c.id && b.status === "em_cliente").length;
    return <>
      <Titulo titulo={c.nome} nota={c.endereco}><View style={estilo.linha}><Botao onPress={() => abrir()}>Voltar aos clientes</Botao><Botao onPress={() => abrir(c.id, true)}>Editar cliente</Botao></View></Titulo>
      <Cartao><View style={estilo.linha}>
        <Dado rotulo="CNPJ" valor={formatarCnpj(c.cnpj)} /><Dado rotulo="Responsável" valor={c.responsavel} />
        <Dado rotulo="Telefone" valor={c.telefone} /><Dado rotulo="Status" valor={ROTULOS_STATUS_CLIENTE[c.status]} />
        <Dado rotulo="Bombonas vinculadas" valor={formatarNumero(vinculadas)} /><Dado rotulo="Bombonas no local" valor={formatarNumero(noLocal)} />
        <Dado rotulo="Última movimentação" valor={formatarDataHora(ult?.registradoEm)} />
      </View>
      <MapaBase altura={300} regiao={focar(c)} marcadores={[{ ...c, titulo: c.nome, cor: cor.primaryMedium }]} selecionar={() => {}} /></Cartao>
      <View style={estilo.espalhar}><Text style={estilo.subtitulo}>Bombonas vinculadas</Text>
        <Botao desabilitado={c.status !== "ativo"} onPress={() => setVincular(true)}>Registrar entrega ao cliente</Botao></View>
      <ListaBombonas painel={painel} cliente={c.id} abrir={abrirBombona} executar={executar} />
      <Text style={estilo.subtitulo}>Histórico do cliente</Text>
      <Historico key={c.id} painel={painel} clienteInicial={c.id} abrir={abrirBombona} executar={executar} embutido />
      {vincular && <Vincular painel={painel} executar={executar} ocupado={ocupado} destino={c.id} evento="entrega_cliente" fechar={() => setVincular(false)} />}
    </>;
  }
  const filtrados = estado.clientes.filter(item => normalizar(`${item.nome} ${item.cnpj} ${item.endereco}`).includes(normalizar(busca)));
  const indice = Math.min(pagina, Math.max(0, Math.ceil(filtrados.length / 20) - 1));
  return <>
    <Titulo titulo="Clientes" nota="Restaurantes e estabelecimentos vinculados à operação.">
      <Botao icon={Plus} variante="principal" onPress={() => abrir(undefined, true)}>Cadastrar cliente</Botao>
    </Titulo>
    <Cartao><Campo rotulo="Buscar cliente" value={busca} onChangeText={v => { setBusca(v); setPagina(0); }} />
      {!filtrados.length && <Text style={estilo.nota}>Nenhum cliente encontrado.</Text>}
      {filtrados.slice(indice * 20, (indice + 1) * 20).map(item => <View key={item.id} style={[estilo.espalhar, estilo.divisoria]}>
        <View style={{ flex: 1, minWidth: 145 }}><Text style={estilo.rotulo}>{item.nome}</Text>
          <Text style={estilo.nota}>{item.endereco} · {formatarNumero(estado.bombonas.filter(b => b.clienteId === item.id).length)} bombonas</Text></View>
        <Tag texto={ROTULOS_STATUS_CLIENTE[item.status]} tom={item.status === "ativo" ? "verde" : "cinza"} />
        <Botao onPress={() => abrir(item.id)}>Ver cliente</Botao>
      </View>)}
      <Paginas pagina={indice} temMais={(indice + 1) * 20 < filtrados.length} anterior={() => setPagina(indice - 1)} proxima={() => setPagina(indice + 1)} />
    </Cartao>
  </>;
}
function FormCliente({ c, painel, executar, ocupado, abrir }: { c?: Cliente; painel: Painel; executar: Executar; ocupado: boolean; abrir: Nav["abrir"] }) {
  const [campos, setCampos] = useState({ nome: c?.nome ?? "", cnpj: c?.cnpj ?? "", responsavel: c?.responsavel ?? "",
    telefone: c?.telefone ?? "", endereco: c?.endereco ?? "" });
  const [latitude, lat] = useState(c ? formatarCoordenada(c.latitude) : "");
  const [longitude, lng] = useState(c ? formatarCoordenada(c.longitude) : "");
  const [status, setStatus] = useState<Cliente["status"]>(c?.status ?? "ativo");
  const rotulos = { nome: "Nome do estabelecimento", cnpj: "CNPJ", responsavel: "Responsável", telefone: "Telefone", endereco: "Endereço" };
  return <>
    <Titulo titulo={c ? "Editar cliente" : "Cadastrar cliente"} />
    <Cartao>
      <View style={estilo.linha}>{(Object.keys(rotulos) as (keyof typeof rotulos)[]).map(chave => <View key={chave} style={{ flexBasis: 220, flexGrow: 1, flexShrink: 1 }}>
        <Campo rotulo={rotulos[chave]} value={campos[chave]} onChangeText={v => setCampos(a => ({ ...a, [chave]: v }))} /></View>)}</View>
      <Coordenadas latitude={latitude} longitude={longitude} lat={lat} lng={lng} />
      <Escolha rotulo="Status do cliente" valor={status} escolher={setStatus} itens={opcoes(ROTULOS_STATUS_CLIENTE)} />
      <View style={estilo.linha}><Botao variante="principal" desabilitado={ocupado} onPress={() => executar(async () => {
        const dados = { nome: campos.nome.trim(), cnpj: limparCnpj(campos.cnpj), responsavel: campos.responsavel.trim(),
          telefone: campos.telefone.trim(), endereco: campos.endereco.trim(), latitude: coordenadas(latitude), longitude: coordenadas(longitude), status };
        validarCliente(dados, painel.estado.clientes, c?.id);
        const id = painel.demo ? painel.demo.salvarCliente(dados, c?.id) : await salvarClienteProducao(dados, c?.id);
        if (painel.demo) await painel.persistir(); else await painel.recarregar();
        abrir(id);
      }, c ? "Cliente atualizado." : "Cliente cadastrado.")}>Salvar cliente</Botao>
      <Botao onPress={() => abrir(c?.id)}>Cancelar</Botao></View>
    </Cartao>
  </>;
}
export function Caminhoes({ painel, id, editando, abrir, executar, ocupado, abrirBombona }: Props & Nav) {
  const [vinculo, setVinculo] = useState<EventoOperacional>();
  const [rotaReal, setRotaReal] = useState<PontoRota[]>([]);
  const [erroRota, setErroRota] = useState("");
  const c = painel.estado.caminhoes.find(item => item.id === id);
  const { demo, simulacao } = painel;
  useEffect(() => {
    if (demo || !id) return;
    let ativo = true;
    void carregarRota(id).then(r => { if (ativo) setRotaReal(r); }, () => { if (ativo) setErroRota("Não foi possível carregar a rota."); });
    return () => { ativo = false; };
  }, [demo, id]);
  if (editando) return <FormCaminhao key={id ?? "novo"} c={c} painel={painel} executar={executar} ocupado={ocupado} abrir={abrir} />;
  if (c) {
    const rota = simulacao?.rotas[c.id] ?? rotaReal;
    const total = painel.estado.bombonas.filter(b => b.caminhaoId === c.id).length;
    return <>
      <Titulo titulo={c.identificacao} nota={c.placa}><View style={estilo.linha}><Botao onPress={() => abrir()}>Voltar aos caminhões</Botao>
        <Botao onPress={() => abrir(c.id, true)}>Editar caminhão</Botao></View></Titulo>
      <Cartao><View style={estilo.linha}>
        <Dado rotulo="Modelo" valor={c.modelo} /><Dado rotulo="Motorista" valor={c.motorista} />
        <Dado rotulo="Status" valor={ROTULOS_STATUS_CAMINHAO[c.status]} /><Dado rotulo="Dispositivo GPS" valor={c.dispositivoGps} />
        <Dado rotulo="Última atualização" valor={formatarDataHora(c.ultimaComunicacao)} /><Dado rotulo="Bombonas transportadas" valor={formatarNumero(total)} />
      </View>
      <Text style={estilo.subtitulo}>Histórico de rota</Text>
      <MapaBase altura={325} regiao={enquadrar([...rota, c], focar(c))} rota={rota}
        marcadores={[{ ...c, cor: "#44399A", titulo: c.identificacao }]} selecionar={() => {}} />
      <Text style={estilo.nota}>{erroRota || (rota.length ? `${formatarNumero(rota.length)} posições registradas` : "Nenhuma posição de rota registrada.")}</Text>
      {!!rota.length && <View style={estilo.linha}><Botao onPress={() => executar(() => exportarCsv("biooleo-rota.csv",
        ["Caminhão", "Data e hora (Brasília)", "Latitude", "Longitude"], rota.map(p => [c.identificacao, formatarDataHora(p.registradoEm),
          formatarCoordenada(p.latitude), formatarCoordenada(p.longitude)])), "Rota exportada.")}>Exportar rota</Botao></View>}
      </Cartao>
      <View style={estilo.espalhar}><Text style={estilo.subtitulo}>Bombonas transportadas</Text><View style={estilo.linha}>
        <Botao desabilitado={c.status === "manutencao"} onPress={() => setVinculo("retirada_caminhao")}>Associar bombona</Botao>
        <Botao desabilitado={!total} onPress={() => setVinculo("entrada_deposito")}>Descarregar no depósito</Botao></View></View>
      <ListaBombonas painel={painel} caminhao={c.id} abrir={abrirBombona} executar={executar} />
      <Text style={estilo.subtitulo}>Movimentações do caminhão</Text>
      <Historico caminhao={c.id} painel={painel} abrir={abrirBombona} executar={executar} embutido />
      {vinculo && <Vincular painel={painel} executar={executar} ocupado={ocupado} destino={c.id} evento={vinculo} fechar={() => setVinculo(undefined)} />}
    </>;
  }
  return <>
    <Titulo titulo="Caminhões" nota="Acompanhe veículos, rotas e bombonas transportadas.">
      {!demo && <Botao icon={Plus} variante="principal" onPress={() => abrir(undefined, true)}>Cadastrar caminhão</Botao>}
    </Titulo>
    {painel.estado.caminhoes.length === 0 && <Cartao><Text style={estilo.nota}>Nenhum caminhão cadastrado.</Text></Cartao>}
    <View style={[estilo.linha, { alignItems: "stretch" }]}>{painel.estado.caminhoes.map(item => <Cartao key={item.id} style={{ flexBasis: 300, flexGrow: 1, flexShrink: 1 }}>
      <View style={estilo.espalhar}><Text style={estilo.subtitulo}>{item.identificacao}</Text><Tag texto={ROTULOS_STATUS_CAMINHAO[item.status]} /></View>
      <Text style={estilo.texto}>{item.placa} · {item.modelo}</Text>
      <Text style={estilo.nota}>{formatarNumero(painel.estado.bombonas.filter(b => b.caminhaoId === item.id).length)} bombonas · {formatarDataHora(item.ultimaComunicacao)}</Text>
      <View style={estilo.linha}><Botao onPress={() => abrir(item.id)}>Ver caminhão</Botao></View>
    </Cartao>)}</View>
  </>;
}
function FormCaminhao({ c, painel, executar, ocupado, abrir }: { c?: Caminhao; painel: Painel; executar: Executar; ocupado: boolean; abrir: Nav["abrir"] }) {
  const [campos, setCampos] = useState({ identificacao: c?.identificacao ?? "", placa: c?.placa ?? "", modelo: c?.modelo ?? "",
    motorista: c?.motorista ?? "", dispositivoGps: c?.dispositivoGps ?? "" });
  const [latitude, lat] = useState(c ? formatarCoordenada(c.latitude) : "");
  const [longitude, lng] = useState(c ? formatarCoordenada(c.longitude) : "");
  const [status, setStatus] = useState<Caminhao["status"]>(c?.status ?? "em_operacao");
  const rotulos = { identificacao: "Identificação", placa: "Placa", modelo: "Modelo", motorista: "Motorista", dispositivoGps: "Dispositivo GPS" };
  return <>
    <Titulo titulo={c ? "Editar caminhão" : "Cadastrar caminhão"} />
    <Cartao>
      <View style={estilo.linha}>{(Object.keys(rotulos) as (keyof typeof rotulos)[]).map(chave => <View key={chave} style={{ flexBasis: 220, flexGrow: 1, flexShrink: 1 }}>
        <Campo rotulo={rotulos[chave]} value={campos[chave]} onChangeText={v => setCampos(a => ({ ...a, [chave]: v }))} /></View>)}</View>
      <Coordenadas latitude={latitude} longitude={longitude} lat={lat} lng={lng} />
      <Escolha rotulo="Status do veículo" valor={status} escolher={setStatus} itens={opcoes(ROTULOS_STATUS_CAMINHAO)} />
      <View style={estilo.linha}><Botao variante="principal" desabilitado={ocupado} onPress={() => executar(async () => {
        const dados = { identificacao: campos.identificacao.trim(), placa: campos.placa.trim().toUpperCase(), modelo: campos.modelo.trim(),
          motorista: campos.motorista.trim(), dispositivoGps: campos.dispositivoGps.trim().toUpperCase(),
          latitude: coordenadas(latitude), longitude: coordenadas(longitude), status };
        validarCoordenadas(dados);
        if (!dados.identificacao || !dados.modelo || !dados.motorista || !dados.dispositivoGps || !/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(dados.placa)) {
          throw new Error("Preencha todos os campos e informe uma placa brasileira válida.");
        }
        if (painel.demo && c) {
          painel.demo.salvarCaminhao(c.id, dados); await painel.persistir(); abrir(c.id);
        } else if (!painel.demo) {
          const id = await salvarCaminhaoProducao(c?.id, dados); await painel.recarregar(); abrir(id);
        }
      }, "Caminhão salvo.")}>Salvar caminhão</Botao><Botao onPress={() => abrir(c?.id)}>Cancelar</Botao></View>
    </Cartao>
  </>;
}
