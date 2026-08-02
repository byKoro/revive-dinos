/**
 * battery/processing.js
 * ---------------------------------------------------------------------------
 * Processamento da Bateria. A cada tick puxa energia de geradores da rede
 * (adjacentes OU ligados por cabo) para encher o próprio buffer.
 *
 * A bateria não processa itens — é puro armazenamento. As máquinas encontram
 * a bateria via BFS (network.js) e consomem dela.
 *
 * Só puxa de GERADOR, nunca de outra bateria (via rede): senão duas baterias
 * ficariam trocando carga entre si indefinidamente. Porém baterias empilhadas
 * verticalmente formam uma coluna: a energia flui para baixo primeiro, e
 * quando a de baixo está cheia, o excesso sobe para a de cima.
 * ---------------------------------------------------------------------------
 */

import { PROP_FRAME, PROP_STAGE, PROP_STAGE_TICK } from "../core/constants";
import { inventarioDe } from "../core/items";
import {
  BATTERY_BLOCK_ID,
  BATTERY_MAX_CHARGE,
  GENERATOR_BLOCK_ID,
  PROP_ENTITY_CHARGE,
} from "../energy/constants";
import { buscarBlocoComCarga, entidadeDaFonte } from "../energy/network";
import { primeiroTick } from "../machine/state";
import { aplicarFrame, limparItensDropados, restaurarSlotsDeUi } from "../machine/ui";
import { gravarEspelho, lerEspelho } from "./mirror";
import { system } from "@minecraft/server";

/** Quanto a bateria puxa por tick. Alto para não ser gargalo da rede. */
const TAXA_CARGA = 500;

/** Taxa de transferência entre baterias empilhadas (por tick). */
const TAXA_EMPILHAMENTO = 1000;

/** A bateria só se recarrega a partir de geradores (via rede de cabos). */
const FONTES = new Set([GENERATOR_BLOCK_ID]);

/** Quantos estágios acesos a lateral da bateria tem (além do 0 = vazia). */
const BATTERY_SIDE_STAGES = 4;

/** Fração mínima de carga para acender o primeiro estágio visual (10%). */
const LIMIAR_VISUAL = 0.10;

export function tickBattery(entity, def) {
  const inv = inventarioDe(entity);
  if (inv) {
    restaurarSlotsDeUi(def, entity, inv, PROP_FRAME);
    limparItensDropados(entity);
  }

  let charge = entity.getDynamicProperty(PROP_ENTITY_CHARGE) ?? 0;

  // A carga pertence ao BLOCO, então uma entidade recém-nascida recupera do
  // espelho da posição. Isso vale SÓ no primeiro tick dela.
  if (primeiroTick(entity)) {
    const espelho = lerEspelho(entity.location);
    if (charge <= 0 && espelho > 0) {
      charge = espelho;
      entity.setDynamicProperty(PROP_ENTITY_CHARGE, charge);
    }
  }

  // ── EMPILHAMENTO: transferir para a bateria de baixo ──────────────────────
  charge = transferirParaBaixo(entity, charge);

  // ── Recarregar de geradores via rede de cabos ─────────────────────────────
  charge = recarregarDeGeradores(entity, charge);

  // ── EMPILHAMENTO: se estou cheia, empurrar excesso em cadeia para cima ────
  if (charge > BATTERY_MAX_CHARGE) {
    const excesso = charge - BATTERY_MAX_CHARGE;
    const absorvido = empurrarParaCimaEmCadeia(entity, excesso);
    charge = BATTERY_MAX_CHARGE + (excesso - absorvido);
  }
  charge = Math.min(charge, BATTERY_MAX_CHARGE);

  // Atualiza a prop se mudou
  if ((entity.getDynamicProperty(PROP_ENTITY_CHARGE) ?? 0) !== charge) {
    entity.setDynamicProperty(PROP_ENTITY_CHARGE, charge);
  }

  // Espelho acompanha a entidade
  if (lerEspelho(entity.location) !== charge) gravarEspelho(entity.location, charge);

  // Visual
  if (inv) desenharPreenchimento(def, entity, inv, charge);
  marcarEstagioLateral(entity, charge);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMPILHAMENTO
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Se há uma bateria diretamente abaixo com espaço, transfere carga para ela.
 * A energia "desce" por gravidade — uma coluna de baterias enche de baixo
 * para cima.
 */
function transferirParaBaixo(entity, charge) {
  if (charge <= 0) return charge;

  const abaixo = bateriaAdjacente(entity, { x: 0, y: -1, z: 0 });
  if (!abaixo) return charge;

  const cargaAbaixo = abaixo.getDynamicProperty(PROP_ENTITY_CHARGE) ?? 0;
  const espacoAbaixo = BATTERY_MAX_CHARGE - cargaAbaixo;
  if (espacoAbaixo <= 0) return charge;

  const transferir = Math.min(TAXA_EMPILHAMENTO, charge, espacoAbaixo);
  abaixo.setDynamicProperty(PROP_ENTITY_CHARGE, cargaAbaixo + transferir);
  return charge - transferir;
}

/**
 * Empurra excesso de energia em cadeia para cima. Sobe bateria a bateria até
 * encontrar uma com espaço ou acabar a coluna.
 *
 * Retorna quanto foi absorvido pela cadeia.
 *
 * Limite de 16 blocos para evitar loops infinitos em edge-cases impossíveis.
 */
function empurrarParaCimaEmCadeia(entity, excesso) {
  let restante = excesso;
  let pos = {
    x: Math.floor(entity.location.x),
    y: Math.floor(entity.location.y),
    z: Math.floor(entity.location.z),
  };

  for (let i = 0; i < 16 && restante > 0; i++) {
    pos = { x: pos.x, y: pos.y + 1, z: pos.z };

    const bloco = entity.dimension.getBlock(pos);
    if (!bloco || bloco.typeId !== BATTERY_BLOCK_ID) break;

    const ent = entidadeDaFonte(entity.dimension, bloco);
    if (!ent?.isValid) break;

    const carga = ent.getDynamicProperty(PROP_ENTITY_CHARGE) ?? 0;
    const espaco = BATTERY_MAX_CHARGE - carga;
    if (espaco <= 0) continue; // essa está cheia, subir mais

    const transferir = Math.min(restante, espaco, TAXA_EMPILHAMENTO);
    ent.setDynamicProperty(PROP_ENTITY_CHARGE, carga + transferir);
    restante -= transferir;
  }

  return excesso - restante;
}

/**
 * Puxa energia de geradores via rede de cabos (BFS).
 * Aceita overflow quando há baterias acima com espaço na coluna — o excesso
 * será distribuído por empurrarParaCimaEmCadeia no mesmo tick.
 */
function recarregarDeGeradores(entity, charge) {
  // Calcula espaço próprio + espaço disponível na coluna acima
  const espacoProprio = Math.max(0, BATTERY_MAX_CHARGE - charge);
  const espacoColuna = espacoNaColunaAcima(entity);
  const espacoTotal = espacoProprio + Math.min(TAXA_EMPILHAMENTO, espacoColuna);

  if (espacoTotal <= 0) return charge;

  const gerador = buscarBlocoComCarga(entity.dimension, entity.location, FONTES);
  if (!gerador) return charge;

  const genEnt = entidadeDaFonte(entity.dimension, gerador);
  if (!genEnt?.isValid) return charge;

  const genCharge = genEnt.getDynamicProperty(PROP_ENTITY_CHARGE) ?? 0;
  const transferir = Math.min(TAXA_CARGA, genCharge, espacoTotal);
  if (transferir <= 0) return charge;

  genEnt.setDynamicProperty(PROP_ENTITY_CHARGE, genCharge - transferir);
  return charge + transferir;
}

/**
 * Soma o espaço disponível em toda a coluna de baterias acima (até 16 blocos).
 * Usado para decidir se a bateria de baixo pode aceitar mais energia do gerador.
 */
function espacoNaColunaAcima(entity) {
  let total = 0;
  let pos = {
    x: Math.floor(entity.location.x),
    y: Math.floor(entity.location.y),
    z: Math.floor(entity.location.z),
  };

  for (let i = 0; i < 16; i++) {
    pos = { x: pos.x, y: pos.y + 1, z: pos.z };

    const bloco = entity.dimension.getBlock(pos);
    if (!bloco || bloco.typeId !== BATTERY_BLOCK_ID) break;

    const ent = entidadeDaFonte(entity.dimension, bloco);
    if (!ent?.isValid) break;

    const carga = ent.getDynamicProperty(PROP_ENTITY_CHARGE) ?? 0;
    total += Math.max(0, BATTERY_MAX_CHARGE - carga);
  }

  return total;
}

/**
 * Acha a entidade-container de uma bateria adjacente na direção dada.
 * Retorna a entidade (com carga acessível), ou undefined.
 */
function bateriaAdjacente(entity, offset) {
  const pos = {
    x: Math.floor(entity.location.x) + offset.x,
    y: Math.floor(entity.location.y) + offset.y,
    z: Math.floor(entity.location.z) + offset.z,
  };

  const bloco = entity.dimension.getBlock(pos);
  if (!bloco || bloco.typeId !== BATTERY_BLOCK_ID) return undefined;

  return entidadeDaFonte(entity.dimension, bloco);
}

// ═══════════════════════════════════════════════════════════════════════════════
// VISUAL
// ═══════════════════════════════════════════════════════════════════════════════

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

/**
 * Marca o estágio visual da lateral (0–4) com base na fração de carga.
 * 0 = abaixo de 10% (sem luz), 1–4 = 10%→100% dividido em 4 faixas iguais.
 *
 * Usa PROP_STAGE + PROP_STAGE_TICK para que `atualizarVisual` aplique a
 * permutação no bloco (mesma infraestrutura das outras máquinas).
 */
function marcarEstagioLateral(entity, carga) {
  if (entity?.isValid !== true) return;

  const fracao = Math.min(1, Math.max(0, carga / BATTERY_MAX_CHARGE));

  let estagio;
  if (fracao < LIMIAR_VISUAL) {
    estagio = 0;
  } else if (fracao >= 1) {
    estagio = BATTERY_SIDE_STAGES;
  } else {
    // Mapeia [LIMIAR_VISUAL..1) em estágios [1..BATTERY_SIDE_STAGES-1]
    const normalizada = (fracao - LIMIAR_VISUAL) / (1 - LIMIAR_VISUAL);
    estagio = Math.min(
      BATTERY_SIDE_STAGES - 1,
      Math.max(1, Math.ceil(normalizada * BATTERY_SIDE_STAGES)),
    );
  }

  if (entity.getDynamicProperty(PROP_STAGE) !== estagio) {
    entity.setDynamicProperty(PROP_STAGE, estagio);
  }
  entity.setDynamicProperty(PROP_STAGE_TICK, system.currentTick);
}
