import { z } from 'zod';

const SpritesType = z.record(z.string(), z.unknown());

export class Sprites {
  private static sprites?: Array<string>;

  private constructor() {}

  static async init(): Promise<void> {
    const response = await fetch('https://basemaps.linz.govt.nz/v1/sprites/topographic.json');
    const json: unknown = await response.json();

    const parse = SpritesType.safeParse(json);
    if (!parse.success) throw new Error();

    this.sprites = Object.keys(parse.data);
  }

  static verify(spriteName: string): boolean {
    if (this.sprites === undefined) throw new Error();

    if (spriteName.length === 0) return true;
    return this.sprites.includes(spriteName);
  }
}
