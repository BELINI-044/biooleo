import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import { ActivityIndicator, Text, View } from "react-native";
import "leaflet/dist/leaflet.css";
import type { PropsMapa } from "./mapa";

export default function MapaBase({ marcadores, regiao, foco, rota, altura, selecionar, mover }: PropsMapa) {
  const elemento = useRef<HTMLDivElement>(null);
  const mapa = useRef<LeafletMap | null>(null);
  const camada = useRef<LayerGroup | null>(null);
  const estado = useRef({ mover, selecionar });
  useEffect(() => { estado.current = { mover, selecionar }; }, [mover, selecionar]);
  const [lib, setLib] = useState<typeof import("leaflet")>();
  const [erro, setErro] = useState("");
  useEffect(() => {
    let ativo = true;
    let monitor: ResizeObserver | undefined;
    void import("leaflet").then(L => {
      if (!ativo || !elemento.current) return;
      const m = L.map(elemento.current, { zoomControl: false, attributionControl: true });
      L.control.zoom({ zoomInTitle: "Aproximar", zoomOutTitle: "Afastar" }).addTo(m);
      L.tileLayer(process.env.EXPO_PUBLIC_MAPA_WEB_URL ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19, attribution: process.env.EXPO_PUBLIC_MAPA_WEB_ATRIBUICAO ?? '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).on("tileerror", () => setErro("O mapa-base está indisponível. As posições continuam visíveis."))
        .on("tileload", () => setErro("")).addTo(m);
      m.attributionControl.setPrefix(false);
      m.on("moveend", () => {
        const b = m.getBounds(), c = m.getCenter();
        estado.current.mover?.({ latitude: c.lat, longitude: c.lng, latitudeDelta: b.getNorth() - b.getSouth(), longitudeDelta: b.getEast() - b.getWest() });
      });
      mapa.current = m;
      camada.current = L.layerGroup().addTo(m);
      monitor = new ResizeObserver(() => m.invalidateSize());
      monitor.observe(elemento.current);
      setLib(L);
    }).catch(() => { if (ativo) setErro("Não foi possível abrir o mapa-base."); });
    return () => { ativo = false; monitor?.disconnect(); mapa.current?.remove(); mapa.current = null; };
  }, []);
  useEffect(() => {
    if (!lib || !mapa.current) return;
    const { latitude: y, longitude: x, latitudeDelta: dy, longitudeDelta: dx } = regiao;
    mapa.current.fitBounds([[y - dy / 2, x - dx / 2], [y + dy / 2, x + dx / 2]], { animate: false, maxZoom: 19 });
  }, [regiao, lib]);
  useEffect(() => {
    const grupo = camada.current;
    if (!lib || !grupo) return;
    grupo.clearLayers();
    if (rota && rota.length > 1) lib.polyline(rota.map(p => [p.latitude, p.longitude]), { color: "#2851A2", weight: 4 }).addTo(grupo);
    for (const marcador of marcadores) {
      const { latitude, longitude, cor, texto, id, titulo } = marcador;
      const badge = document.createElement("span");
      badge.textContent = texto ?? "";
      badge.style.cssText = `display:grid;place-items:center;border:2px solid white;background:${cor};color:white;width:100%;height:100%;box-sizing:border-box;box-shadow:0 1px 5px #26352d66;border-radius:50%;font:700 11px system-ui`;
      const tamanho = texto ? (texto.length > 3 ? 39 : 31) : foco === id ? 21 : 15;
      lib.marker([latitude, longitude], {
        icon: lib.divIcon({ html: badge, className: "", iconSize: [tamanho, tamanho], iconAnchor: [tamanho / 2, tamanho / 2] }),
        title: titulo, alt: titulo, zIndexOffset: id === foco ? 2000 : marcador.veiculo ? 1000 : 0,
      }).on("click", () => estado.current.selecionar(id)).addTo(grupo);
    }
  }, [lib, marcadores, foco, rota]);
  return <View style={{ borderRadius: 12, overflow: "hidden", backgroundColor: "#E2ECE5" }}>
    <div ref={elemento} aria-label="Mapa GPS" style={{ height: altura, width: "100%", zIndex: 0 }} />
    {!lib && !erro && <ActivityIndicator accessibilityLabel="Carregando mapa GPS" style={{ position: "absolute", top: altura / 2, alignSelf: "center" }} color="#123B2C" />}
    {!!erro && <Text style={{ color: "#5E4504", padding: 8 }}>{erro}</Text>}
  </View>;
}
