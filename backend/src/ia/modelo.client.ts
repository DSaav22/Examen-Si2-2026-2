import { Injectable, Logger } from '@nestjs/common';

type Mensaje = { role: 'system' | 'user' | 'assistant'; content: string };

@Injectable()
export class ModeloClient {
  private readonly log = new Logger(ModeloClient.name);

  configurado() {
    return Boolean(process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY);
  }

  async completar(mensajes: Mensaje[], json = false): Promise<string | null> {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT?.replace(/\/$/, '');
    const key = process.env.AZURE_OPENAI_API_KEY;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4.1-mini';
    const version = process.env.AZURE_OPENAI_API_VERSION || '2024-10-21';
    if (!endpoint || !key) return null;

    try {
      const res = await fetch(
        `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${version}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'api-key': key },
          body: JSON.stringify({
            messages: mensajes,
            temperature: 0.2,
            max_tokens: 700,
            ...(json ? { response_format: { type: 'json_object' } } : {}),
          }),
          signal: AbortSignal.timeout(25_000),
        },
      );
      if (!res.ok) {
        this.log.warn(`El modelo respondió ${res.status}`);
        return null;
      }
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = data.choices?.[0]?.message?.content?.trim();
      return text || null;
    } catch (error) {
      this.log.warn(`No se pudo llamar al modelo: ${(error as Error).message}`);
      return null;
    }
  }
}
