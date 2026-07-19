/**
 * Astro (usado pelo Pelando) serializa os props de um island diretamente no
 * HTML, no atributo `props="..."` do elemento que o hidrata — os dados
 * chegam no SSR, sem precisar de navegador/JS para renderizar. O valor é um
 * JSON com um formato de serialização próprio: cada nó é `[tag, payload]`,
 * onde tag `1` marca um array (payload já é a lista de nós) e tag `0` marca
 * um valor (objeto com campos também taggeados, ou primitivo).
 */

export function extractAstroIslandProps(html: string, propKey: string): Record<string, unknown> | null {
  const keyIndex = html.indexOf(`&quot;${propKey}&quot;`);
  if (keyIndex === -1) {
    return null;
  }

  const propsAttrIndex = html.lastIndexOf('props="', keyIndex);
  if (propsAttrIndex === -1) {
    return null;
  }

  const valueStart = propsAttrIndex + 'props="'.length;
  const valueEnd = html.indexOf('"', valueStart);
  if (valueEnd === -1) {
    return null;
  }

  const decoded = html
    .slice(valueStart, valueEnd)
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

  try {
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function unwrapAstroSerialized(node: unknown): unknown {
  if (Array.isArray(node) && node.length === 2 && typeof node[0] === 'number') {
    const [tag, payload] = node as [number, unknown];

    if (tag === 1 && Array.isArray(payload)) {
      return payload.map(unwrapAstroSerialized);
    }

    if (tag === 0) {
      if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
        return Object.fromEntries(
          Object.entries(payload as Record<string, unknown>).map(([key, value]) => [
            key,
            unwrapAstroSerialized(value),
          ]),
        );
      }
      return payload;
    }

    return unwrapAstroSerialized(payload);
  }

  return node;
}
