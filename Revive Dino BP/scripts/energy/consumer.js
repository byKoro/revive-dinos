/**
 * energy/consumer.js
 * ---------------------------------------------------------------------------
 * Consumo de energia pelas máquinas — REDE UNIFICADA.
 *
 * A máquina não escolhe "uma fonte": ela vê a soma de todas as fontes
 * alcançáveis pela rede de cabos. Se o total cobrir o custo, o consumo é
 * distribuído entre elas, drenando primeiro os GERADORES e só depois as
 * BATERIAS (a bateria funciona como reserva).
 *
 * Cache: a topologia da rede é cacheada por CACHE_TTL ticks para a BFS não
 * rodar todo tick — foi o que garantia velocidade constante independente da
 * distância do cabo. O cache é invalidado sozinho se as fontes sumirem.
 * ---------------------------------------------------------------------------
 */

import {
  BATTERY_BLOCK_ID,
  GENERATOR_BLOCK_ID,
  PROP_ENTITY_CHARGE,
} from "./constants";
import { coletarFontes, entidadeDaFonte } from "./network";

/** Ticks entre re-varreduras da rede. */
const CACHE_TTL = 20;

const PROP_CACHE = "revive_dinos:net_cache";
const PROP_CACHE_AGE = "revive_dinos:net_cache_age";

/** Gerador antes de bateria: a bateria é reserva. */
const PRIORIDADE = { [GENERATOR_BLOCK_ID]: 0, [BATTERY_BLOCK_ID]: 1 };

const serializar = (blocos) =>
  blocos.map((b) => `${b.location.x},${b.location.y},${b.location.z}`).join(";");

function desserializar(dimension, texto) {
  if (!texto) return [];
  const blocos = [];
  for (const parte of texto.split(";")) {
    if (!parte) continue;
    const [x, y, z] = parte.split(",").map(Number);
    const b = dimension.getBlock({ x, y, z });
    if (b && PRIORIDADE[b.typeId] !== undefined) blocos.push(b);
  }
  return blocos;
}

/** Fontes da rede desta máquina, usando cache quando possível. */
function fontesDaRede(entity) {
  const dim = entity.dimension;
  const idade = entity.getDynamicProperty(PROP_CACHE_AGE) ?? CACHE_TTL;

  if (idade < CACHE_TTL) {
    const cache = desserializar(dim, entity.getDynamicProperty(PROP_CACHE));
    if (cache.length > 0) {
      entity.setDynamicProperty(PROP_CACHE_AGE, idade + 1);
      return cache;
    }
  }

  const fontes = coletarFontes(dim, entity.location);
  entity.setDynamicProperty(PROP_CACHE, serializar(fontes));
  entity.setDynamicProperty(PROP_CACHE_AGE, 0);
  return fontes;
}

/**
 * Tenta consumir `custo` da rede da máquina. Só consome se o total disponível
 * cobrir o custo inteiro (nada de consumo parcial).
 * Retorna true se conseguiu.
 */
export function consumirEnergia(entity, custo) {
  if (custo <= 0) return true;

  const dim = entity.dimension;
  const fontes = fontesDaRede(entity);
  if (fontes.length === 0) return false;

  // Levanta a carga de cada fonte
  const disponiveis = [];
  let total = 0;
  for (const bloco of fontes) {
    const ent = entidadeDaFonte(dim, bloco);
    if (!ent?.isValid) continue;
    const carga = ent.getDynamicProperty(PROP_ENTITY_CHARGE) ?? 0;
    if (carga <= 0) continue;
    disponiveis.push({ ent, carga, prio: PRIORIDADE[bloco.typeId] ?? 9 });
    total += carga;
  }

  if (total < custo) return false;

  // Drena gerador primeiro, bateria depois
  disponiveis.sort((a, b) => a.prio - b.prio);

  let restante = custo;
  for (const fonte of disponiveis) {
    if (restante <= 0) break;
    const tirar = Math.min(fonte.carga, restante);
    fonte.ent.setDynamicProperty(PROP_ENTITY_CHARGE, fonte.carga - tirar);
    restante -= tirar;
  }
  return true;
}
