import { useState } from "react";
import { Text, View } from "react-native";
import { formatarCoordenada, formatarDataHora, formatarNumero } from "@/lib/format";
import { alterarAlertaProducao } from "@/services/tracking/repository";
import { ROTULOS_GRAVIDADE_ALERTA, ROTULOS_STATUS_ALERTA, ROTULOS_TIPO_ALERTA, type Alerta } from "@/types/tracking";
import type { Executar } from "./actions";
import { Botao, Cartao, Escolha, estilo, opcoes, Paginas, Tag, Titulo } from "./ui";
import type { Painel } from "./usePainel";

export default function Alertas({ painel, bombona, executar, abrir }: { painel: Painel; bombona?: string; executar: Executar; abrir: (id: string) => void }) {
  const [status, setStatus] = useState<"" | Alerta["status"]>("");
  const [tipo, setTipo] = useState<"" | Alerta["tipo"]>("");
  const [pagina, setPagina] = useState(0);
  const filtrados = painel.estado.alertas.filter(a => (!status || a.status === status) &&
    (!tipo || a.tipo === tipo) && (!bombona || a.bombonaId === bombona));
  const indice = Math.min(pagina, Math.max(0, Math.ceil(filtrados.length / 20) - 1));
  const mudar = (id: string, status: Alerta["status"]) => executar(async () => {
    if (painel.demo) { painel.demo.alterarAlerta(id, status); await painel.persistir(); }
    else { await alterarAlertaProducao(id, status); await painel.recarregar(); }
  }, "Alerta atualizado.");
  return <>
    {!bombona && <Titulo titulo="Alertas" nota="Acompanhe ocorrências de comunicação, bateria e movimentação." />}
    <Cartao>
      <View style={estilo.linha}>
        <View style={{ flex: 1, minWidth: 150 }}><Escolha rotulo="Status" valor={status} escolher={v => { setStatus(v); setPagina(0); }}
          itens={[{ value: "", label: "Todos os status" }, ...opcoes(ROTULOS_STATUS_ALERTA)]} /></View>
        <View style={{ flex: 1, minWidth: 165 }}><Escolha rotulo="Tipo de alerta" valor={tipo} escolher={v => { setTipo(v); setPagina(0); }}
          itens={[{ value: "", label: "Todos os tipos" }, ...opcoes(ROTULOS_TIPO_ALERTA)]} /></View>
      </View>
      <Text style={estilo.nota}>{formatarNumero(filtrados.length)} alertas encontrados</Text>
      {filtrados.slice(indice * 20, (indice + 1) * 20).map(a => {
        const b = painel.estado.bombonas.find(item => item.id === a.bombonaId);
        return <View key={a.id} style={[estilo.divisoria, { gap: 8 }]}>
          <View style={estilo.espalhar}><Text style={estilo.subtitulo}>{ROTULOS_TIPO_ALERTA[a.tipo]}</Text>
            <View style={estilo.linha}><Tag texto={ROTULOS_GRAVIDADE_ALERTA[a.gravidade]} tom={a.gravidade === "alta" || a.gravidade === "critica" ? "vermelho" : "ambar"} />
              <Tag texto={ROTULOS_STATUS_ALERTA[a.status]} tom={a.status === "resolvido" ? "verde" : "cinza"} />{a.simulado && <Tag texto="Simulado" tom="azul" />}</View></View>
          <Text style={estilo.texto}>{a.descricao}</Text>
          <Text style={estilo.nota}>{b?.codigo ?? "Bombona indisponível"} · {formatarDataHora(a.registradoEm)} · {formatarCoordenada(a.latitude)} / {formatarCoordenada(a.longitude)}</Text>
          <View style={estilo.linha}>
            {!!b && !bombona && <Botao onPress={() => abrir(b.id)}>Ver bombona</Botao>}
            {a.status === "pendente" && <Botao onPress={() => mudar(a.id, "visualizado")}>Marcar como visualizado</Botao>}
            {a.status !== "resolvido" && <Botao onPress={() => mudar(a.id, "resolvido")}>Resolver</Botao>}
          </View>
        </View>;
      })}
      <Paginas pagina={indice} temMais={(indice + 1) * 20 < filtrados.length} anterior={() => setPagina(indice - 1)} proxima={() => setPagina(indice + 1)} />
    </Cartao>
  </>;
}
