/**
 * main.js
 * ---------------------------------------------------------------------------
 * Ponto de entrada. Registra custom components e assina eventos — a lógica
 * vive nos módulos.
 *
 * Pastas:
 *   core/       constantes e utilidades sem dependência de feature
 *   machine/    framework genérico de máquina (entidade, fake UI, seleção,
 *               funil, ancoragem) dirigido por "definições"
 *   extractor/  definição + receitas do Extrator Genético
 *   generator/  definição + queima do Gerador a Combustão
 *   energy/     cabo + rede de energia
 *   fossil/     minigame da Rocha Fossilizada
 * ---------------------------------------------------------------------------
 */

import { system } from "@minecraft/server";
import { COMPONENT_UI_PLACEHOLDER, COMPONENT_ENERGY_CABLE, COMPONENT_FOSSIL_ROCK } from "./core/constants";

import { registrarMaquina } from "./machine/registry";
import { makeMachineComponent, uiPlaceholderComponent } from "./machine/component";
import { registrarSelecaoFalsa } from "./machine/selection";
import { registrarHopper } from "./machine/hopper";
import { registrarLimpezaAoEntrar, registrarRemocaoPorDestruicao } from "./machine/events";

import { extractorDef } from "./extractor/definition";
import { generatorDef } from "./generator/definition";
import { batteryDef } from "./battery/definition";
import { synthesizerDef } from "./synthesizer/definition";
import { sequencerDef } from "./sequencer/definition";

import { energyCableComponent } from "./energy/cable";
import { registrarTransferenciaDeBateria } from "./battery/transfer";
import { registrarMinigameDaRocha } from "./fossil/minigame";
import { fossilRockComponent } from "./fossil/rock";

// Registra as máquinas no framework (os handlers genéricos despacham por elas)
registrarMaquina(extractorDef);
registrarMaquina(generatorDef);
registrarMaquina(batteryDef);
registrarMaquina(synthesizerDef);
registrarMaquina(sequencerDef);

// ---------------------------------------------------------------------------
// Custom components (V2)
// ---------------------------------------------------------------------------
system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
  const reg = blockComponentRegistry;

  reg.registerCustomComponent(extractorDef.componentId, makeMachineComponent(extractorDef));
  reg.registerCustomComponent(generatorDef.componentId, makeMachineComponent(generatorDef));
  reg.registerCustomComponent(batteryDef.componentId, makeMachineComponent(batteryDef));
  reg.registerCustomComponent(synthesizerDef.componentId, makeMachineComponent(synthesizerDef));
  reg.registerCustomComponent(sequencerDef.componentId, makeMachineComponent(sequencerDef));
  reg.registerCustomComponent(COMPONENT_UI_PLACEHOLDER, uiPlaceholderComponent);
  reg.registerCustomComponent(COMPONENT_ENERGY_CABLE, energyCableComponent);
  reg.registerCustomComponent(COMPONENT_FOSSIL_ROCK, fossilRockComponent);
});

// ---------------------------------------------------------------------------
// Eventos de mundo
// ---------------------------------------------------------------------------
registrarSelecaoFalsa();
registrarHopper();
registrarRemocaoPorDestruicao();
registrarLimpezaAoEntrar();
registrarTransferenciaDeBateria();
registrarMinigameDaRocha();
