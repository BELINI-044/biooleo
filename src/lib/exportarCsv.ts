import { Platform } from "react-native";
import { File, Paths } from "expo-file-system";
import { isAvailableAsync, shareAsync } from "expo-sharing";
import { supabase } from "@/lib/supabase";

function gerarCsv(cabecalho: string[], linhas: (string | number | null)[][]) {
  return "\ufeff" + [cabecalho, ...linhas].map(linha => linha.map(valor => {
    const campo = String(valor ?? "");
    const seguro = typeof valor === "string" && /^[\t\r\n ]*[=+@-]/.test(campo) && !/^[-+]?\d+(?:[,.]\d+)?$/.test(campo) ? "'" + campo : campo;
    return '"' + seguro.replaceAll('"', '""') + '"';
  }).join(";")).join("\r\n");
}

export async function exportarCsv(nome: string, cabecalho: string[], linhas: (string | number | null)[][]) {
  const texto = gerarCsv(cabecalho, linhas);
  if (Platform.OS === "web") {
    const url = URL.createObjectURL(new Blob([texto], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = nome; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  if (!(await isAvailableAsync())) throw new Error("Este dispositivo não oferece compartilhamento de arquivos.");
  const arquivo = new File(Paths.cache, nome);
  arquivo.write(texto);
  await shareAsync(arquivo.uri, { mimeType: "text/csv", dialogTitle: "Exportar relatório BioOleo" });
}

export async function arquivarCsv(nome: string, cabecalho: string[], linhas: (string | number | null)[][]) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Sua sessão expirou. Entre novamente.");
  const arquivo = new TextEncoder().encode(gerarCsv(cabecalho, linhas));
  const nomeArquivo = `${data.user.id}/${new Date().toISOString().replaceAll(":", "-")}-${nome}`;
  const envio = await supabase.storage.from("relatorios-biooleo").upload(nomeArquivo, arquivo.buffer, {
    contentType: "text/csv", upsert: false,
  });
  if (envio.error) throw new Error("Não foi possível arquivar o relatório no Supabase.");
}
