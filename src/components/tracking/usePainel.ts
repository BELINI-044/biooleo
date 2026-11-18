import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEMO_MODE } from "@/config/env";
import { carregarDemo, salvarDemo } from "@/services/tracking/demoStorage";
import type { MockTrackingProvider } from "@/services/tracking/MockTrackingProvider";
import { obterPosicoes, estadoVazio, type EstadoDemo, type EstadoPainel } from "@/services/tracking/model";
import { carregarProducao } from "@/services/tracking/repository";

export function usePainel() {
  const [estado, setEstado] = useState<EstadoPainel>(estadoVazio);
  const [demo, setDemo] = useState<MockTrackingProvider | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);
  const versao = useRef(0);
  const persistencia = useRef(Promise.resolve());
  const atualizar = useCallback(async () => {
    const solicitacao = ++versao.current;
    const dados = await carregarProducao();
    if (solicitacao === versao.current) setEstado(dados);
  }, []);
  useEffect(() => {
    let conectado = true;
    let parar: (() => void) | undefined;
    async function iniciar() {
      try {
        if (DEMO_MODE) {
          const provedor = await carregarDemo();
          if (!conectado) return;
          setDemo(provedor);
          setEstado(provedor.snapshot());
          const cancelar = provedor.assinar(() => {
            const snapshot = provedor.snapshot();
            setEstado(snapshot);
            const salvar = salvarDemo(snapshot);
            persistencia.current = salvar;
            void salvar.then(() => setErro(""), () => setErro("Falha ao salvar a demonstração no dispositivo."));
          });
          parar = () => { cancelar(); provedor.parar(); };
          if (provedor.snapshot().ativo) provedor.iniciar();
        } else {
          await atualizar();
        }
      } catch (e) {
        if (conectado) setErro(e instanceof Error ? e.message : "Não foi possível abrir o painel.");
      } finally {
        if (conectado) setCarregando(false);
      }
    }
    void iniciar();
    return () => { conectado = false; parar?.(); };
  }, [tentativa, atualizar]);
  const posicoes = useMemo(() => obterPosicoes(estado), [estado]);
  return {
    estado, demo, simulacao: demo ? estado as EstadoDemo : null, posicoes, carregando, erro,
    atualizar: async () => { if (demo) { demo.atualizar(); await persistencia.current; } else await atualizar(); },
    persistir: () => persistencia.current,
    recarregar: atualizar, tentarNovamente: () => { setCarregando(true); setErro(""); setTentativa(n => n + 1); },
  };
}
export type Painel = ReturnType<typeof usePainel>;
