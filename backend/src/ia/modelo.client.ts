import { Injectable, Logger } from '@nestjs/common';

type Mensaje = { role: 'system' | 'user' | 'assistant'; content: string };

@Injectable()
export class ModeloClient {
  private readonly log = new Logger(ModeloClient.name);

  configurado() {
    return Boolean(process.env.GEMINI_API_KEY?.trim());
  }

  async completar(mensajes: Mensaje[], json = false): Promise<string | null> {
    const key = process.env.GEMINI_API_KEY?.trim();
    const modelo = process.env.GEMINI_MODEL?.trim() || 'gemini-3.1-flash-lite';
    if (!key) return null;
    const sistema = mensajes.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
    const contents = mensajes.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    if (!contents.length) return null;

    try {
      const peticion = () =>
        fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
            body: JSON.stringify({
              ...(sistema ? { systemInstruction: { parts: [{ text: sistema }] } } : {}),
              contents,
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 2048,
                ...(json ? { responseMimeType: 'application/json' } : {}),
              },
            }),
            signal: AbortSignal.timeout(25_000),
          },
        );

      let res = await peticion();
      if (res.status === 503 || res.status === 429) {
        await new Promise((r) => setTimeout(r, 700));
        res = await peticion();
      }

      if (!res.ok) {
        this.log.warn(`Gemini respondió HTTP ${res.status}; se usará el respaldo local.`);
        return null;
      }
      const data = (await res.json()) as { candidates?: { finishReason?: string; content?: { parts?: { text?: string; thought?: boolean }[] } }[] };
      const candidato = data.candidates?.[0];
      // No exponer razonamiento ni aceptar una respuesta cortada o bloqueada.
      if (candidato?.finishReason && candidato.finishReason !== 'STOP') return null;
      const text = candidato?.content?.parts?.filter(p => !p.thought).map(p => p.text ?? '').join('').trim();
      return text || null;
    } catch (err) {
      this.log.warn(`No se pudo obtener respuesta de Gemini (${err instanceof Error ? err.message : String(err)}); se usará el respaldo local.`);
      return null;
    }
  }
}
