/**
 * battery/charge.js
 * ---------------------------------------------------------------------------
 * Serialização da carga da bateria no ItemStack.
 *
 * Por que na LORE e não em dynamic property: o item de um bloco é empilhável,
 * e o Bedrock recusa dynamic property em item empilhável
 * ("Cannot set dynamic properties on stackable items"). A lore aceita, é
 * persistente, e ainda serve de exibição para o jogador — dois coelhos.
 *
 * A última linha carrega o valor em formato legível por máquina; as anteriores
 * são a exibição bonita. Duas baterias com cargas diferentes têm lore
 * diferente e, por isso, não empilham entre si.
 * ---------------------------------------------------------------------------
 */

import { BATTERY_MAX_CHARGE } from "../energy/constants";

/** Marcador da linha técnica da lore. */
const TAG = "\u00a78\u26a1";

const fmt = (n) => n.toLocaleString("en-US");

/** Monta as linhas de lore para uma carga. */
export function loreDaCarga(carga) {
  const pct = Math.floor((carga / BATTERY_MAX_CHARGE) * 100);
  return [
    `\u00a77Energia: \u00a7e${fmt(carga)}\u00a77 / ${fmt(BATTERY_MAX_CHARGE)}`,
    `\u00a77Carga: \u00a7a${pct}%`,
    `${TAG}${carga}`,
  ];
}

/** Lê a carga gravada na lore de um item. Retorna 0 se não houver. */
export function cargaDaLore(item) {
  const linhas = item?.getLore?.() ?? [];
  for (const linha of linhas) {
    if (!linha.startsWith(TAG)) continue;
    const valor = Number.parseInt(linha.slice(TAG.length), 10);
    if (Number.isFinite(valor) && valor > 0) return valor;
  }
  return 0;
}
