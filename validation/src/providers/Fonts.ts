import { z } from 'zod';

const FontsType = z.array(z.string());

export class Fonts {
  private static fonts?: Array<string>;

  private constructor() {}

  static async init(): Promise<void> {
    const response = await fetch('https://basemaps.linz.govt.nz/v1/fonts.json');
    const json: unknown = await response.json();

    const parse = FontsType.safeParse(json);
    if (!parse.success) throw new Error();

    this.fonts = parse.data;
  }

  static verify(fontName: string): boolean {
    if (this.fonts === undefined) throw new Error();

    return this.fonts.includes(fontName);
  }
}
