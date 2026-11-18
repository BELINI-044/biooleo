import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import Pause from "lucide-react-native/icons/pause";
import Play from "lucide-react-native/icons/play";
import RotateCcw from "lucide-react-native/icons/rotate-ccw";
import Truck from "lucide-react-native/icons/truck";
import { formatarCoordenada, formatarDataHora, formatarNumero } from "@/lib/format";
import { coordenadas, validarCoordenadas } from "@/services/tracking/model";
import { definirDepositoProducao, depositoProducao } from "@/services/tracking/repository";
import type { Executar } from "./actions";
import { Botao, Campo, Cartao, Dado, estilo, Janela, Tag, Titulo } from "./ui";
import type { Painel } from "./usePainel";

export default function Configuracoes({ painel, executar, ocupado }: { painel: Painel; executar: Executar; ocupado: boolean }) {
  const { demo, simulacao } = painel;
  const [confirmar, setConfirmar] = useState(false);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [erro, setErro] = useState("");
  useEffect(() => {
    if (demo || painel.carregando) return;
    let ativo = true;
    void depositoProducao().then(p => {
      if (ativo && p) { setLatitude(formatarCoordenada(p.latitude)); setLongitude(formatarCoordenada(p.longitude)); }
    }, () => { if (ativo) setErro("Não foi possível carregar as coordenadas do depósito."); });
    return () => { ativo = false; };
  }, [demo, painel.carregando]);
  const rodar = (acao: () => void, sucesso: string) => executar(async () => { acao(); await painel.persistir(); }, sucesso);
  return <>
    <Titulo titulo="Configurações" nota="Frequência prevista de rastreamento: a cada 30 minutos" />
    {demo && simulacao ? <>
      <Cartao>
        <View style={estilo.espalhar}><Text style={estilo.subtitulo}>Simulador GPS</Text>
          <Tag texto={simulacao.ativo ? "Em execução" : "Pausado"} tom={simulacao.ativo ? "verde" : "cinza"} /></View>
        <Text style={estilo.nota}>Cada ciclo de 12 segundos avança o relógio operacional em 30 minutos. As posições são simuladas no Paraná.</Text>
        <View style={estilo.linha}>
          <Dado rotulo="Ciclos concluídos" valor={formatarNumero(simulacao.ciclo)} />
          <Dado rotulo="Última transmissão simulada" valor={formatarDataHora(simulacao.ultimoCicloEm)} />
          <Dado rotulo="Posições no último ciclo" valor={formatarNumero(simulacao.posicoesNoUltimoCiclo)} />
        </View>
        <View style={estilo.linha}>
          <Botao icon={Play} variante="principal" desabilitado={ocupado || simulacao.ativo} onPress={() => rodar(() => demo.iniciar(), "Simulação iniciada.")}>Iniciar simulação</Botao>
          <Botao icon={Pause} desabilitado={ocupado || !simulacao.ativo} onPress={() => rodar(() => demo.pausar(), "Simulação pausada.")}>Pausar simulação</Botao>
          <Botao icon={Truck} desabilitado={ocupado} onPress={() => rodar(() => demo.simularDeslocamentoCaminhoes(), "Deslocamento simulado.")}>Simular deslocamento dos caminhões</Botao>
          <Botao desabilitado={ocupado} onPress={() => rodar(() => demo.definirDeslocamento(!simulacao.deslocamento),
            simulacao.deslocamento ? "Deslocamento automático desativado." : "Deslocamento automático ativado.")}>{simulacao.deslocamento ? "Pausar deslocamento automático" : "Retomar deslocamento automático"}</Botao>
        </View>
      </Cartao>
      <Cartao><Text style={estilo.subtitulo}>Ocorrências simuladas</Text>
        <Text style={estilo.nota}>O alerta de perda de comunicação aparece depois de mais de 60 minutos no relógio simulado.</Text>
        <View style={estilo.linha}>
          <Botao desabilitado={ocupado} onPress={() => rodar(() => demo.simularPerdaComunicacao(), "Perda de comunicação simulada.")}>Simular perda de comunicação</Botao>
          <Botao desabilitado={ocupado} onPress={() => rodar(() => demo.simularRecuperacaoSinal(), "Recuperação de sinal simulada.")}>Simular recuperação de sinal</Botao>
          <Botao desabilitado={ocupado} onPress={() => rodar(() => demo.simularBateriaBaixa(), "Bateria baixa simulada.")}>Simular bateria baixa</Botao>
        </View>
      </Cartao>
      <View style={estilo.linha}><Botao icon={RotateCcw} onPress={() => setConfirmar(true)}>Reiniciar dados da demonstração</Botao></View>
      <Janela aberta={confirmar} titulo="Reiniciar dados da demonstração?" fechar={() => setConfirmar(false)}>
        <Text style={estilo.texto}>Os cadastros, alterações e o histórico local serão substituídos pela base inicial de 3.000 bombonas.</Text>
        <Botao variante="perigo" desabilitado={ocupado} onPress={() => rodar(() => { demo.reiniciar(); setConfirmar(false); }, "Dados da demonstração reiniciados.")}>Confirmar reinício</Botao>
      </Janela>
    </> : <>
      <Cartao><Text style={estilo.subtitulo}>Integração Vision Telematics</Text><Text style={estilo.nota}>Aguardando documentação e credenciais oficiais para receber posições dos rastreadores físicos.</Text></Cartao>
      <Cartao><Text style={estilo.subtitulo}>Localização do depósito</Text>
        {!!erro && <Text style={estilo.nota}>{erro}</Text>}
        <View style={estilo.linha}>
          <View style={{ flex: 1, minWidth: 120 }}><Campo rotulo="Latitude" value={latitude} onChangeText={setLatitude} /></View>
          <View style={{ flex: 1, minWidth: 120 }}><Campo rotulo="Longitude" value={longitude} onChangeText={setLongitude} /></View>
        </View>
        <View style={estilo.linha}><Botao variante="principal" desabilitado={ocupado} onPress={() => executar(async () => {
          const p = { latitude: coordenadas(latitude), longitude: coordenadas(longitude) };
          validarCoordenadas(p); await definirDepositoProducao(p); setErro("");
        }, "Localização do depósito salva.")}>Salvar localização</Botao></View>
      </Cartao>
    </>}
  </>;
}
