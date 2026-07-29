/**
 * battery/processing.js
 * ---------------------------------------------------------------------------
 * Processamento da Bateria. A cada tick puxa energia de geradores da rede
 * (adjacentes OU ligados por cabo) para encher o próprio buffer.
 *
 * A bateria não processa itens — é puro armazenamento. As máquinas encontram
 * a bateria via BFS (network.js) e consomem dela.
 *
 * Só puxa de GERADOR, nunca de outra bateria: senão duas baterias ficariam
 * trocando carga entre si indefinidamente.
 * ---------------------------------------------------------------------------
 */

import { PROP_FRAME } from "../core/constants";
import { inventarioDe } from "../core/items";
import {
  BATTERY_MAX_CHARGE,
  GENERATOR_BLOCK_ID,
  PROP_ENTITY_CHARGE,
} from "../energy/constants";
import { buscarBlocoComCarga, entidadeDaFonte } from "../energy/network";
import { primeiroTick } from "../machine/state";
import { aplicarFrame, limparItensDropados, restaurarSlotsDeUi } from "../machine/ui";
import { gravarEspelho, lerEspelho } from "./mirror";

/** Quanto a bateria puxa por tick. Alto para não ser gargalo da rede. */
const TAXA_CARGA = 500;

/** A bateria só se recarrega a partir de geradores. */
const FONTES = new Set([GENERATOR_BLOCK_ID]);

export function tickBattery(entity, def) {
  const inv = inventarioDe(entity);
  if (inv) {
    restaurarSlotsDeUi(def, entity, inv, PROP_FRAME);
    limparItensDropados(entity);
  }

  let charge = entity.getDynamicProperty(PROP_ENTITY_CHARGE) ?? 0;

  // A UI inteira é a bateria enchendo: o frame acompanha a carga.
  if (inv) desenharPreenchimento(def, entity, inv, charge);

  // A carga pertence ao BLOCO, então uma entidade recém-nascida recupera do
  // espelho da posição. Isso vale SÓ no primeiro tick dela: usar "carga zerada"
  // como sinal de entidade recriada devolvia a energia que as máquinas acabaram
  // de consumir (o espelho é gravado antes do consumo), criando carga infinita.
  if (primeiroTick(entity)) {
    const espelho = lerEspelho(entity.location);
    if (charge <= 0 && espelho > 0) {
      charge = espelho;
      entity.setDynamicProperty(PROP_ENTITY_CHARGE, charge);
    }
  }

  // Daqui pra frente o espelho só ACOMPANHA a entidade, nunca a corrige.
  if (lerEspelho(entity.location) !== charge) gravarEspelho(entity.location, charge);

  if (charge >= BATTERY_MAX_CHARGE) return;

  // Acha um gerador com carga na rede (adjacente ou via cabo)
  const gerador = buscarBlocoComCarga(entity.dimension, entity.location, FONTES);
  if (!gerador) return;

  const genEnt = entidadeDaFonte(entity.dimension, gerador);
  if (!genEnt?.isValid) return;

  const genCharge = genEnt.getDynamicProperty(PROP_ENTITY_CHARGE) ?? 0;
  const transferir = Math.min(TAXA_CARGA, genCharge, BATTERY_MAX_CHARGE - charge);
  if (transferir <= 0) return;

  genEnt.setDynamicProperty(PROP_ENTITY_CHARGE, genCharge - transferir);
  entity.setDynamicProperty(PROP_ENTITY_CHARGE, charge + transferir);
}

/**
 * Traduz a carga em frame de preenchimento.
 *
 * Só chega ao último frame quando a bateria está realmente cheia, e só mostra
 * o frame 0 quando está de fato vazia — assim o visual não "mente" nas pontas.
 */
function desenharPreenchimento(def, entity, inv, carga) {
  const frames = def.layout.progressFrames;
  const fracao = Math.min(1, Math.max(0, carga / BATTERY_MAX_CHARGE));

  let frame;
  if (fracao <= 0) frame = 0;
  else if (fracao >= 1) frame = frames;
  else frame = Math.min(frames - 1, Math.max(1, Math.round(fracao * frames)));

  aplicarFrame(def, entity, inv, frame, PROP_FRAME);
}
