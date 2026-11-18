import { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import type { PropsMapa } from "./mapa";

export default function MapaBase({ marcadores, regiao, foco, rota, altura, selecionar, mover }: PropsMapa) {
  const mapa = useRef<MapView>(null);
  useEffect(() => { mapa.current?.animateToRegion(regiao, 300); }, [regiao]);
  return <View style={{ height: altura, borderRadius: 12, overflow: "hidden", backgroundColor: "#E2ECE5" }}>
    <MapView ref={mapa} accessibilityLabel="Mapa GPS" style={StyleSheet.absoluteFill} initialRegion={regiao} onRegionChangeComplete={mover}
      rotateEnabled={false} pitchEnabled={false} toolbarEnabled={false}>
      {rota && rota.length > 1 && <Polyline coordinates={rota} strokeColor="#2851A2" strokeWidth={4} />}
      {marcadores.map(m => <Marker key={m.id} coordinate={m} identifier={m.id} title={m.titulo}
        accessibilityLabel={m.titulo} zIndex={m.id === foco ? 10 : m.veiculo ? 5 : 1} onPress={() => selecionar(m.id)}>
        <View style={{ backgroundColor: m.cor, borderColor: "white", borderWidth: 2, borderRadius: 20,
          minWidth: m.texto ? 29 : 17, height: m.texto ? 29 : 17, paddingHorizontal: 4, alignItems: "center", justifyContent: "center" }}>
          {!!m.texto && <Text style={{ color: "white", fontSize: 10, fontWeight: "800" }}>{m.texto}</Text>}
        </View>
      </Marker>)}
    </MapView>
  </View>;
}
