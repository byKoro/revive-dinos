/**
 * main.js
 * ---------------------------------------------------------------------------
 * Ponto de entrada do addon. Só registra custom components e assina eventos —
 * toda a lógica vive nos módulos.
 *
 * Estrutura das pastas:
 *   core/       constantes e utilidades sem dependência de feature
 *   extractor/  Extrator Genético (bloco, entidade, fake UI, funil, seleção)
 *   fossil/     Rocha Fossilizada (minigame do martelo)
 *
 * Custom Components V2: o registro acontece em `system.beforeEvents.startup`.
 * `world.beforeEvents.worldInitialize` é V1 e não funciona aqui.
 * ---------------------------------------------------------------------------
 */

import { system } from "@minecraft/server";

import {
  COMPONENT_EXTRACTOR,
  COMPONENT_FOSSIL_ROCK,
  COMPONENT_UI_PLACEHOLDER,
  COMPONENT_ENERGY_CABLE,
} from "./core/constants";

import {
  extractorMachineComponent,
  uiPlaceholderComponent,
} from "./extractor/component";
import {
  registrarLimpezaAoEntrar,
  registrarRemocaoPorDestruicao,
} from "./extractor/events";
import { registrarCompatibilidadeComFunil } from "./extractor/hopper";
import { registrarSelecaoFalsa } from "./extractor/selection";

import { registrarMinigameDaRocha } from "./fossil/minigame";
import { fossilRockComponent } from "./fossil/rock";

import { energyCableComponent } from "./energy/cable";

// ---------------------------------------------------------------------------
// Custom components (V2)
// ---------------------------------------------------------------------------
system.beforeEvents.startup.subscribe(({ blockComponentRegistry }) => {
  blockComponentRegistry.registerCustomComponent(
    COMPONENT_EXTRACTOR,
    extractorMachineComponent,
  );
  blockComponentRegistry.registerCustomComponent(
    COMPONENT_UI_PLACEHOLDER,
    uiPlaceholderComponent,
  );
  blockComponentRegistry.registerCustomComponent(
    COMPONENT_FOSSIL_ROCK,
    fossilRockComponent,
  );
  blockComponentRegistry.registerCustomComponent(
    COMPONENT_ENERGY_CABLE,
    energyCableComponent,
  );
});

// ---------------------------------------------------------------------------
// Eventos de mundo
// ---------------------------------------------------------------------------
registrarRemocaoPorDestruicao();
registrarCompatibilidadeComFunil();
registrarSelecaoFalsa();
registrarLimpezaAoEntrar();
registrarMinigameDaRocha();
