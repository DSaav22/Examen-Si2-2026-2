import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

export type EnvioCorreoResultado = {
  ok: boolean;
  modo: 'smtp' | 'simulado';
  destino: string;
  messageId?: string;
};

@Injectable()
export class CorreoService {
  private readonly log = new Logger(CorreoService.name);

  constructor(private readonly config: ConfigService) {}

  /** true si hay host + usuario + clave SMTP */
  estaConfigurado(): boolean {
    const host = this.config.get<string>('SMTP_HOST')?.trim();
    const user = this.config.get<string>('SMTP_USER')?.trim();
    const pass = this.config.get<string>('SMTP_PASS')?.trim();
    return Boolean(host && user && pass);
  }

  private transporter() {
    const host = this.config.get<string>('SMTP_HOST')?.trim();
    const user = this.config.get<string>('SMTP_USER')?.trim();
    const pass = this.config.get<string>('SMTP_PASS')?.trim();
    if (!host || !user || !pass) return null;

    const port = Number(this.config.get<string>('SMTP_PORT') ?? '587');
    const secureEnv = this.config.get<string>('SMTP_SECURE')?.trim().toLowerCase();
    const secure = secureEnv ? secureEnv === '1' || secureEnv === 'true' : port === 465;
    const service = this.config.get<string>('SMTP_SERVICE')?.trim().toLowerCase();
    // Azure Communication Services SMTP usa 587 + STARTTLS (igual que BioFarm).
    const requireTLS =
      this.config.get<string>('SMTP_REQUIRE_TLS')?.trim().toLowerCase() === 'true' ||
      host.includes('azurecomm.net') ||
      (!secure && port === 587);

    const options: SMTPTransport.Options = service
      ? {
          service,
          auth: { user, pass },
        }
      : {
          host,
          port,
          secure,
          requireTLS,
          auth: { user, pass },
        };

    return nodemailer.createTransport(options);
  }

  async enviar(opts: {
    para: string;
    asunto: string;
    html: string;
    texto?: string;
  }): Promise<EnvioCorreoResultado> {
    const from =
      this.config.get<string>('SMTP_FROM')?.trim() ||
      this.config.get<string>('SMTP_USER')?.trim() ||
      'EnsayAR <noreply@ensayar.bo>';
    const transport = this.transporter();
    if (!transport) {
      this.log.warn(
        `[simulado] Sin SMTP_HOST/USER/PASS. Correo a ${opts.para}: ${opts.asunto}`,
      );
      return { ok: true, modo: 'simulado', destino: opts.para };
    }

    try {
      const info = await transport.sendMail({
        from,
        to: opts.para,
        subject: opts.asunto,
        html: opts.html,
        text: opts.texto,
      });
      this.log.log(`Correo SMTP enviado a ${opts.para} (${info.messageId})`);
      return {
        ok: true,
        modo: 'smtp',
        destino: opts.para,
        messageId: info.messageId,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.log.error(`Fallo SMTP hacia ${opts.para}: ${msg}`);
      throw new ServiceUnavailableException({
        codigo: 'SMTP_FALLO',
        message: `No se pudo enviar el correo: ${msg}`,
      });
    }
  }

  async probar(para: string) {
    return this.enviar({
      para,
      asunto: 'EnsayAR · prueba de correo',
      html: `<p>Si leés esto, el SMTP de EnsayAR (Azure) está funcionando.</p><p>Destino: <strong>${para}</strong></p>`,
      texto: `Prueba SMTP EnsayAR → ${para}`,
    });
  }
}
