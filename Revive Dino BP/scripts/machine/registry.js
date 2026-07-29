/**
 * machine/registry.js
 * ---------------------------------------------------------------------------
 * Registro das definições de máquina. Cada máquina (Extrator, Gerador, e as
 * futuras) é descrita por um objeto de definição; o framework genérico
 * (entity/ui/selection/hopper/component) opera sobre essas definições.
 *
 * Forma de uma definição:
 * {
 *   id, blockId, entityId, componentId,
 *   layout: {
 *     inputs: [slot...],        // aceitam itens do jogador, começam vazios
 *     outputs: [slot...],       // protegidos, começam com placeholder
 *     outputSlot,               // slot que o funil de baixo puxa (ou undefined)
 *     backgroundSlots: [slot...],
 *     progressSlot,             // slot da barra de progresso (ou null)
 *     uiBackgroundId, uiProgressId, progressFrames,
 *     placeholderItem,
 *   },
 *   processTick(entity, def),   // lógica por tick da máquina
 *   routeIngredient(item, def), // slot destino de um item vindo de funil, ou undefined
 *   frontAnimada,               // true = o bloco troca a textura da frente por
 *                               // estágio de processo e toca o som de trabalho
 *                               // (exige o state `machine_stage` no bloco)
 * }
 * ---------------------------------------------------------------------------
 */

const porBloco = new Map();
const porEntidade = new Map();
const todas = [];

export function registrarMaquina(def) {
  porBloco.set(def.blockId, def);
  porEntidade.set(def.entityId, def);
  todas.push(def);
}

export const defPorBloco = (blockId) => porBloco.get(blockId);
export const defPorEntidade = (entityId) => porEntidade.get(entityId);
export const todasAsMaquinas = () => todas;
