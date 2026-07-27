/**
 * battery/charge.js
 * ---------------------------------------------------------------------------
 * Serialização da carga da bateria no ItemStack.
 *
 * Por que na LORE e não em dynamic property: o item de um bloco é empilhável,
 * e o Bedrock recusa dynamic property em item empilhável
 * ("Cannot set dynamic properties on stackable items"). A lore aceita, é
 * persistente, e ainda serve de exibição para o jogador.
 *
 * A última linha guarda o valor em formato legível por máquina. O marcador é
 * ASCII puro de propósito: um marcador com emoji quebrava o parse se o jogo
 * normalizasse o caractere. Além disso o parse tem fallback pela linha de
 * exibição, então a carga sobrevive mesmo se a linha técnica se perder.
 * ---------------------------------------------------------------------------
 */

import { BATTERY_MAX_CHARGE } from "../energy/constants";

/** Marcador ASCII da linha técnica da lore. */
const MARCADOR = "\u00a78rd:";

/** Acha "rd:<numero>" em qualquer lugar da linha. */
const RE_MARCADOR = /rd:(\d+)/;

/** Fallback: primeiro número (com ou sem separador de milhar) da linha. */
const RE_NUMERO = /([\d,.]+)/;

const fmt = (n) => n.toLocaleString("en-US");

/** Monta as linhas de lore para uma carga. */
export function loreDaCarga(carga) {
  const pct = Math.floor((carga / BATTERY_MAX_CHARGE) * 100);
  return [
    `\u00a77Energia: \u00a7e${fmt(carga)}\u00a77 / ${fmt(BATTERY_MAX_CHARGE)}`,
    `\u00a77Carga: \u00a7a${pct}%`,
    `${MARCADOR}${carga}`,
  ];
}

/** Lê a carga gravada na lore de um item. Retorna 0 se não houver. */
export function cargaDaLore(item) {
  let linhas;
  try {
    linhas = item?.getLore?.() ?? [];
  } catch {
    return 0;
  }

  // 1) linha técnica (caminho normal)
  for (const linha of linhas) {
    const m = RE_MARCADOR.exec(linha);
    if (m) {
      const valor = Number.parseInt(m[1], 10);
      if (Number.isFinite(valor) && valor > 0) return valor;
    }
  }

  // 2) fallback: extrai da linha de exibição "Energia: 45,000 / 100,000"
  for (const linha of linhas) {
    if (!linha.includes("Energia")) continue;
    const m = RE_NUMERO.exec(linha.replace(/\u00a7./g, ""));
    if (!m) continue;
    const valor = Number.parseInt(m[1].replace(/[,.]/g, ""), 10);
    if (Number.isFinite(valor) && valor > 0) return valor;
  }

  return 0;
}
