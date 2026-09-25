import { Injectable, Logger } from '@nestjs/common';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

export type FluxResultado = {
  url: string;
  modelo: string;
};

@Injectable()
export class FluxClient {
  private readonly log = new Logger(FluxClient.name);

  configurado() {
    return Boolean(
      process.env.AZURE_AI_ENDPOINT &&
        process.env.AZURE_AI_API_KEY &&
        (process.env.AZURE_FLUX_DEPLOYMENT || 'FLUX.2-pro'),
    );
  }

  /**
   * Try-on: foto de la clienta (+ opcional foto de prenda) vía FLUX.2-pro (BFL).
   * Kontext tenía cuota 0 en Students; FLUX.2-pro admite varias referencias.
   */
  async probarPrenda(opts: {
    prompt: string;
    imagenPersonaB64: string;
    imagenPrendaB64?: string;
  }): Promise<FluxResultado | null> {
    const endpoint = process.env.AZURE_AI_ENDPOINT?.replace(/\/$/, '');
    const key = process.env.AZURE_AI_API_KEY;
    const deployment = process.env.AZURE_FLUX_DEPLOYMENT || 'FLUX.2-pro';
    const version = process.env.AZURE_FLUX_API_VERSION || 'preview';
    if (!endpoint || !key) return null;

    const persona = stripDataUrl(opts.imagenPersonaB64);
    if (!persona) {
      this.log.warn('Imagen de persona vacía o inválida');
      return null;
    }

    const modelPath = deploymentToPath(deployment);
    const url = `${endpoint}/providers/blackforestlabs/v1/${modelPath}?api-version=${version}`;

    const payload: Record<string, unknown> = {
      model: deployment,
      prompt: opts.prompt.slice(0, 4000),
      width: 1024,
      height: 1024,
      output_format: 'jpeg',
      num_images: 1,
      input_image: persona,
    };
    const prenda = opts.imagenPrendaB64 ? stripDataUrl(opts.imagenPrendaB64) : '';
    if (prenda) payload.input_image_2 = prenda;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
          'api-key': key,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(120_000),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        this.log.warn(`FLUX respondió ${res.status}: ${detail.slice(0, 300)}`);
        return null;
      }
      const data = (await res.json()) as Record<string, unknown>;
      const saved = await persistirRespuesta(data);
      if (!saved) {
        this.log.warn('FLUX OK pero sin imagen en la respuesta');
        return null;
      }
      return { url: saved, modelo: deployment };
    } catch (error) {
      this.log.warn(`No se pudo llamar a FLUX: ${(error as Error).message}`);
      return null;
    }
  }
}

function deploymentToPath(deployment: string): string {
  const map: Record<string, string> = {
    'FLUX.2-pro': 'flux-2-pro',
    'FLUX.2-flex': 'flux-2-flex',
    'FLUX.1-Kontext-pro': 'flux-kontext-pro',
    'FLUX-1.1-pro': 'flux-pro-1.1',
  };
  return map[deployment] ?? deployment.toLowerCase().replace(/\./g, '-');
}

function stripDataUrl(raw: string): string {
  const s = raw.trim();
  const m = /^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/s.exec(s);
  return (m ? m[1] : s).replace(/\s/g, '');
}

async function persistirRespuesta(data: Record<string, unknown>): Promise<string | null> {
  const b64 =
    extractB64(data) ??
    extractB64(data.result as Record<string, unknown> | undefined) ??
    extractB64(data.data as unknown);
  if (b64) {
    const dir = join(process.cwd(), 'public', 'uploads', 'tryon');
    mkdirSync(dir, { recursive: true });
    const name = `tryon-${randomUUID()}.jpg`;
    writeFileSync(join(dir, name), Buffer.from(b64, 'base64'));
    return `/uploads/tryon/${name}`;
  }
  const remote = extractUrl(data) ?? extractUrl(data.data as unknown);
  return remote;
}

function extractB64(node: unknown): string | null {
  if (!node) return null;
  if (typeof node === 'string' && node.length > 100 && !node.startsWith('http')) {
    return stripDataUrl(node);
  }
  if (Array.isArray(node)) {
    for (const item of node) {
      const hit = extractB64(item);
      if (hit) return hit;
    }
    return null;
  }
  if (typeof node === 'object') {
    const o = node as Record<string, unknown>;
    for (const key of ['b64_json', 'base64', 'image', 'image_base64', 'sample']) {
      if (typeof o[key] === 'string' && (o[key] as string).length > 80) {
        return stripDataUrl(o[key] as string);
      }
    }
    if (Array.isArray(o.data)) return extractB64(o.data);
    if (Array.isArray(o.images)) return extractB64(o.images);
  }
  return null;
}

function extractUrl(node: unknown): string | null {
  if (!node) return null;
  if (typeof node === 'string' && /^https?:\/\//i.test(node)) return node;
  if (Array.isArray(node)) {
    for (const item of node) {
      const hit = extractUrl(item);
      if (hit) return hit;
    }
    return null;
  }
  if (typeof node === 'object') {
    const o = node as Record<string, unknown>;
    if (typeof o.url === 'string') return o.url;
    if (Array.isArray(o.data)) return extractUrl(o.data);
    if (Array.isArray(o.images)) return extractUrl(o.images);
  }
  return null;
}
