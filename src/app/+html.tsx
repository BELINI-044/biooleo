import { ScrollViewStyleReset, useServerDocumentContext } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Documento({ children }: PropsWithChildren) {
  const { headNodes, bodyNodes, htmlAttributes, bodyAttributes } = useServerDocumentContext();
  return <html {...htmlAttributes} lang="pt-BR">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="theme-color" content="#123B2C" />
      <ScrollViewStyleReset />
      {headNodes}
    </head>
    <body {...bodyAttributes}>{children}{bodyNodes}</body>
  </html>;
}
