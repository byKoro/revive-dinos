#!/usr/bin/env python3
"""
tools/gen_machine_frames.py
---------------------------------------------------------------------------
Gera as texturas 16x16 dos frames de processamento das maquinas.

Estas imagens sao BASES SIMPLES para serem sobrepostas/repintadas a mao. Elas
seguem o estilo que ja existia nas texturas do pack:

    - 1px de borda escura em volta
    - preenchimento 14x14 com a cor base
    - um "acento" (painel/visor) no meio do rosto

O frame 0 de cada maquina e a textura `_front.png` que ja existe (nao e
tocada). Os frames 1..3 sao ela + duas coisas:

    1. o acento vai clareando (estagio do processo)
    2. uma fita de 3 LEDs na linha y=13 acende 1, 2 e 3 segmentos

A linha y=13 foi escolhida porque esta livre em TODAS as frentes atuais, entao
a fita nunca cobre arte existente.

Uso:  python3 tools/gen_machine_frames.py
"""

from PIL import Image
import os

RP = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "Revive Dino RP")
BLOCKS = os.path.join(RP, "textures", "blocks")

# Frentes animadas: shortname -> caminho da textura base (frame 0)
FRENTES = {
    "biomass_synthesizer": os.path.join(BLOCKS, "machines", "biomass_synthesizer_front.png"),
    "gene_sequencer": os.path.join(BLOCKS, "machines", "gene_sequencer_front.png"),
    "incubator": os.path.join(BLOCKS, "machines", "incubator_front.png"),
    "combustion_generator": os.path.join(BLOCKS, "energy", "combustion_generator_front.png"),
    "genetic_extractor": os.path.join(BLOCKS, "machines", "genetic_extractor_front.png"),
}

# Quantos frames animados (alem do 0)
FRAMES = 3

# Fita de LEDs: (x_inicio, x_fim) de cada segmento, na linha Y_LED
Y_LED = 13
SEGMENTOS = [(2, 5), (6, 9), (10, 13)]


# ---------------------------------------------------------------------------
# Paleta do extrator (nova, no mesmo estilo das outras maquinas)
# ---------------------------------------------------------------------------
EXT_BORDA = (48, 38, 62, 255)
EXT_BASE = (92, 74, 118, 255)
EXT_ACENTO = (196, 140, 255, 255)
EXT_RIVET = (70, 56, 90, 255)
EXT_TOPO_BORDA = (44, 35, 57, 255)
EXT_TOPO_BASE = (84, 68, 108, 255)
EXT_TOPO_ACENTO = (170, 120, 235, 255)


def nova(borda, base):
    """16x16 com borda de 1px e preenchimento."""
    im = Image.new("RGBA", (16, 16), borda)
    for y in range(1, 15):
        for x in range(1, 15):
            im.putpixel((x, y), base)
    return im


def retangulo(im, x0, y0, x1, y1, cor):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            im.putpixel((x, y), cor)


def gerar_extrator():
    """front/side/top do extrator, para ele seguir o padrao das outras maquinas."""
    destino = os.path.join(BLOCKS, "machines")
    os.makedirs(destino, exist_ok=True)

    # FRONT: visor vertical no centro (deixa a linha y=13 livre para os LEDs)
    front = nova(EXT_BORDA, EXT_BASE)
    retangulo(front, 6, 3, 9, 11, EXT_ACENTO)
    front.save(os.path.join(destino, "genetic_extractor_front.png"))

    # SIDE: mesmos 4 rebites das outras laterais
    side = nova(EXT_BORDA, EXT_BASE)
    for (x, y) in [(2, 2), (13, 2), (2, 13), (13, 13)]:
        side.putpixel((x, y), EXT_RIVET)
    side.save(os.path.join(destino, "genetic_extractor_side.png"))

    # TOP: painel central
    top = nova(EXT_TOPO_BORDA, EXT_TOPO_BASE)
    retangulo(top, 4, 5, 11, 10, EXT_TOPO_ACENTO)
    top.save(os.path.join(destino, "genetic_extractor_top.png"))

    print("  extrator: front/side/top gerados")


def cores(im):
    """(borda, base, acentos) lidos da propria textura."""
    borda = im.getpixel((0, 0))
    base = im.getpixel((1, 1))
    acentos = {
        im.getpixel((x, y))
        for y in range(16)
        for x in range(16)
        if im.getpixel((x, y)) not in (borda, base)
    }
    return borda, base, acentos


def clarear(cor, fator):
    """Interpola a cor em direcao ao branco."""
    r, g, b, a = cor
    return (
        int(r + (255 - r) * fator),
        int(g + (255 - g) * fator),
        int(b + (255 - b) * fator),
        a,
    )


def gerar_frames(nome, caminho):
    base_im = Image.open(caminho).convert("RGBA")
    if base_im.size != (16, 16):
        raise SystemExit("%s nao e 16x16 (%s)" % (caminho, base_im.size))

    borda, base_cor, acentos = cores(base_im)
    if not acentos:
        raise SystemExit("%s nao tem cor de acento para animar" % caminho)
    # Cor mais clara do acento manda no brilho dos LEDs
    acento_ref = max(acentos, key=lambda c: c[0] + c[1] + c[2])

    pasta = os.path.dirname(caminho)
    for frame in range(1, FRAMES + 1):
        fator = 0.18 * frame
        im = base_im.copy()

        # 1. Acento vai clareando conforme o processo avanca
        for y in range(16):
            for x in range(16):
                p = im.getpixel((x, y))
                if p in acentos:
                    im.putpixel((x, y), clarear(p, fator))

        # 2. Fita de LEDs: acende `frame` segmentos
        led_on = clarear(acento_ref, 0.25)
        for i, (x0, x1) in enumerate(SEGMENTOS):
            cor = led_on if i < frame else borda
            for x in range(x0, x1 + 1):
                im.putpixel((x, Y_LED), cor)

        saida = os.path.join(pasta, "%s_front_%d.png" % (nome, frame))
        im.save(saida)
        print("  %s" % os.path.relpath(saida, RP))


def main():
    print("Gerando texturas do extrator...")
    gerar_extrator()
    print("Gerando frames de processamento...")
    for nome, caminho in FRENTES.items():
        gerar_frames(nome, caminho)
    print("OK")


if __name__ == "__main__":
    main()
