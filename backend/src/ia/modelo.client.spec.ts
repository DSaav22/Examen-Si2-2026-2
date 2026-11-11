import { ModeloClient } from './modelo.client';

describe('Cliente Gemini para chatbot y reportes', () => {
  const keyOriginal = process.env.GEMINI_API_KEY;
  const modeloOriginal = process.env.GEMINI_MODEL;
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'clave-sintetica-no-real';
    process.env.GEMINI_MODEL = 'modelo-prueba';
  });
  afterEach(() => {
    if (keyOriginal === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = keyOriginal;
    if (modeloOriginal === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = modeloOriginal;
    jest.restoreAllMocks();
  });

  it('envía instrucciones y conversación con roles Gemini, sin clave en la URL', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'interno', thought: true }, { text: 'Hola ' }, { text: 'clienta' }] } }] }) } as Response);
    await expect(new ModeloClient().completar([
      { role: 'system', content: 'Solo contexto autorizado' }, { role: 'user', content: 'Hola' },
      { role: 'assistant', content: 'Bienvenida' }, { role: 'user', content: 'Consulta' },
    ])).resolves.toBe('Hola clienta');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/modelo-prueba:generateContent');
    expect(String(url)).not.toContain(process.env.GEMINI_API_KEY);
    expect(init?.headers).toMatchObject({ 'x-goog-api-key': 'clave-sintetica-no-real' });
    const body = JSON.parse(init?.body as string);
    expect(body.systemInstruction.parts).toEqual([{ text: 'Solo contexto autorizado' }]);
    expect(body.contents.map((m: { role: string }) => m.role)).toEqual(['user', 'model', 'user']);
    expect(body.generationConfig.responseMimeType).toBeUndefined();
  });

  it('solicita JSON para los reportes', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"fuente":"ventas"}' }] } }] }) } as Response);
    await expect(new ModeloClient().completar([{ role: 'user', content: 'Ventas' }], true)).resolves.toBe('{"fuente":"ventas"}');
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string).generationConfig.responseMimeType).toBe('application/json');
  });

  it('sin clave no llama a ningún proveedor', async () => {
    delete process.env.GEMINI_API_KEY;
    const fetchMock = jest.spyOn(globalThis, 'fetch');
    const modelo = new ModeloClient();
    expect(modelo.configurado()).toBe(false);
    await expect(modelo.completar([{ role: 'user', content: 'Hola' }])).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([401, 429, 503])('permite respaldo local ante HTTP %s', async status => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status } as Response);
    await expect(new ModeloClient().completar([{ role: 'user', content: 'Hola' }])).resolves.toBeNull();
  });

  it.each(['MAX_TOKENS', 'SAFETY'])('descarta respuestas incompletas o bloqueadas: %s', async finishReason => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ candidates: [{ finishReason, content: { parts: [{ text: 'Parcial' }] } }] }) } as Response);
    await expect(new ModeloClient().completar([{ role: 'user', content: 'Hola' }])).resolves.toBeNull();
  });

  it('no propaga errores de red ni imprime el contenido de la excepción', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('detalle de petición sensible'));
    await expect(new ModeloClient().completar([{ role: 'user', content: 'Hola' }])).resolves.toBeNull();
  });
});
