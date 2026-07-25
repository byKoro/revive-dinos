/**
 * energy/generator.js
 * ---------------------------------------------------------------------------
 * Gerador a Combustão. Queima combustível para acumular energia no próprio
 * buffer; as máquinas puxam essa energia pela rede de cabos (network.js).
 *
 * MVP de abastecimento: clicar com combustível na mão insere 1 unidade.
 * Clicar de mãos vazias mostra o status (carga/combustível) na action bar.
 * Funil + Fake UI ficam para quando montarmos a interface (adiado, como no
 * combinado da bateria).
 * ---------------------------------------------------------------------------
 */

import { GameMode, ItemStack } from "@minecraft/server";
import { GENERATOR_MAX_CHARGE, GENERATOR_TICK_INTERVAL } from "./constants";
import { infoCombustivel } from "./fuel";
import {
  addCarga,
  getCarga,
  getFuel,
  getRate,
  limparEnergia,
  setFuel,
  setRate,
} from "./storage";

export const generatorComponent = {
  onPlayerInteract: ({ block, player }) => {
    const slot = player
      .getComponent("minecraft:equippable")
      ?.getEquipmentSlot("Mainhand");
    const item = slot?.getItem();
    const info = item ? infoCombustivel(item.typeId) : undefined;
    const loc = block.location;

    // Sem combustível na mão -> só mostra o status
    if (!info) {
      mostrarStatus(player, loc);
      return;
    }

    // Abastece: define a taxa se o buffer estava vazio e soma o tempo de queima
    if (getFuel(loc) <= 0) setRate(loc, info.rate);
    setFuel(loc, getFuel(loc) + info.ticks);

    if (player.getGameMode() !== GameMode.creative) {
      slot.setItem(
        item.amount > 1
          ? new ItemStack(item.typeId, item.amount - 1)
          : undefined,
      );
    }

    player.playSound("fire.ignite");
    mostrarStatus(player, loc);
  },

  onTick: ({ block }) => {
    const loc = block.location;
    const fuel = getFuel(loc);
    if (fuel <= 0) return;

    // Buffer cheio: pausa a queima (não desperdiça combustível)
    if (getCarga(loc) >= GENERATOR_MAX_CHARGE) return;

    const queima = Math.min(GENERATOR_TICK_INTERVAL, fuel);
    const rate = getRate(loc) || 5;
    addCarga(loc, rate * queima, GENERATOR_MAX_CHARGE);
    setFuel(loc, fuel - queima);
  },

  onPlayerBreak: ({ block }) => {
    limparEnergia(block.location);
  },
};

function mostrarStatus(player, loc) {
  const carga = getCarga(loc);
  const fuel = getFuel(loc);
  player.onScreenDisplay.setActionBar(
    `Energia: ${carga}/${GENERATOR_MAX_CHARGE}  |  Combustível: ${fuel} ticks`,
  );
}
