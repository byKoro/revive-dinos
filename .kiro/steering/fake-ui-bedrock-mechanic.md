# Fake UI — Mecânica de HUD por Blocos-Item (Bedrock)

Este documento detalha a técnica visual usada para criar interfaces
customizadas dentro do container de uma entidade invisível. Adaptado do addon
comercial Furnaces (Crystal Furnace UI), que valida a técnica em produção.

---

## O problema

Minecraft Bedrock não oferece API para sobrepor HUD customizado a um
container. `ActionFormData` e tela customizada existem, mas não co-existem com
slots que o jogador pode arrastar — o container fecha quando qualquer form
abre.

## A solução

Itens de bloco com **geometria plana + `item_display_transforms.gui`**
ocupam slots do inventário. Quando renderizados na tela do container, eles
exibem a arte da textura como se fossem peças de HUD (fundo, barra de
progresso, ícones).

---

## Componentes do sistema

### 1. Blocos de fundo (metades esquerda/direita)

Cada metade é um bloco com geometria de painel único que cobre toda a "fila"
correspondente do container. Posicionados via `translation` na
`item_display_transforms.gui` para não se sobreporem:

- Metade esquerda: `translation: [36, 0, 0]`
- Metade direita: `translation: [-36, 0, 0]`

Exemplo de identifier: `revive_dinos:genetic_extractor_ui_9` (slot 9).

### 2. Barra de progresso (frames)

Sequência de blocos `_progress_0` a `_progress_N`, cada um com mais "preenchimento" na textura. Só um está visível por vez — o script troca o
item no slot a cada atualização de progresso.

`bone_visibility` cumulativo lendo um state fixo (`revive_dinos:progress`)
permite que o modelo mostre a quantidade correta de preenchimento.

Posição: sobre a metade direita (`translation: [-36, 18, 0]` — o `+18`
compensa o slot da barra estar uma linha abaixo do fundo).

### 3. Slot funcional de saída (placeholder)

Quando o resultado sai, o slot fica com `placeholder_invisible` (textura
transparente 1×1). Assim o jogador nunca deposita nada ali.

---

## Proteção anti-exploit

| Vetor de ataque | Defesa |
|---|---|
| Jogador arrasta peça de UI | `restaurarSlotsDeUi` repõe no tick |
| Jogador larga peça no inventário | `limparInventarioDoJogador` (a cada tick perto do bloco + no playerSpawn) |
| Peça cai no chão | `limparItensDropados` (raio de 4 blocos) |
| Funil suga peça | `can_be_siphoned_from: false` na entidade |
| Jogador coloca item no slot de saída | `protegerSlotDeSaida` devolve ao mundo |
| Jogador desloga com peça | `playerSpawn` handler limpa ao reconectar |

`ehItemDeUi(item)` reconhece qualquer peça deste addon: `typeId` começa com
`revive_dinos:` e contém `_ui_` ou `placeholder`.

---

## Geometria e modelos

- Identifier da geometria **sem namespace** (ex.: `geometry.genetic_extractor_ui_left`).
- `format_version` do geo: `1.21.20`.
- Os cubos são de espessura zero (faces planas), com `inflate: 0.02` contra
  z-fighting quando duas peças se sobrepõem.

---

## Render Controller

```json
{
  "format_version": "1.20.80",
  "render_controllers": {
    "controller.render.<maquina>_ui": {
      "geometry": "geometry.default",
      "materials": [{"*": "material.default"}],
      "textures": ["texture.default"]
    }
  }
}
```

A entidade-container **não** precisa de render controller (nem de client
entity) — ela é invisível. Render controllers existem só para as entidades
que SÃO renderizadas (ex.: `outline_selection`).

---

## Como adicionar uma Fake UI para uma máquina nova

1. **Desenhar a textura do fundo** (tamanho de atlas: 64×64 ou 128×128).
2. **Criar a geometria** com 2 bones (metade esquerda/direita), copiando o
   padrão de `genetic_extractor_ui.geo.json`.
3. **Criar as geometrias de progresso** (se houver barra) com N frames via
   `bone_visibility`.
4. **Criar os JSONs de bloco** para cada peça:
   - Identifiers: `revive_dinos:<maquina>_ui_<slot>` e
     `revive_dinos:<maquina>_ui_progress_<frame>`.
   - Component `revive_dinos:ui_placeholder` para que, se colocados no mundo,
     virem ar imediatamente.
5. **Registrar cada bloco em `blocks.json`** (RP) apontando para a textura.
6. **Definir `layout` em `config.js`** com os slots e ids corretos.
7. **Testar**: abrir o container, tentar arrastar cada peça, deslogar dentro
   do menu, bombardear o bloco, usar funil — tudo deve resistir.

---

## Limites conhecidos

- **Tooltip indesejado**: `ItemLockMode.slot` foi testado e revertido — polui
  o tooltip com "não pode ser movido" em toda peça e não impede de fato o
  movimento em todos os casos.
- **Invisibilidade por efeito**: `minecraft:spell_effects` (invisibilidade
  como componente JSON) nunca foi confirmado funcionando antes que a entidade
  renderize; a ausência de client entity é a solução comprovada.
- **`minecraft:custom_hit_test` vazia** para remover sombra: descartado,
  quebrava a detecção de colisão ao agachar.
