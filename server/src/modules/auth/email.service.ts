import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';

type PasswordResetEmail = {
  to: string;
  name: string;
  resetUrl: string;
};

function smtpConfigured() {
  return Boolean(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS && env.SMTP_FROM);
}

export class EmailService {
  async sendPasswordReset(input: PasswordResetEmail) {
    if (!smtpConfigured()) {
      if (env.NODE_ENV !== 'production') console.info(`[password-reset] ${input.to}: ${input.resetUrl}`);
      return { sent: false };
    }

    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS
      }
    });

    await transporter.sendMail({
      from: env.SMTP_FROM,
      to: input.to,
      subject: 'Restablecimiento de contraseña',
      text: [
        `Hola ${input.name},`,
        '',
        'Recibimos una solicitud para restablecer tu contraseña.',
        `Restablece tu contraseña aquí: ${input.resetUrl}`,
        '',
        'Este enlace expira en 30 minutos.',
        'Si no solicitaste esto, puedes ignorar este correo.'
      ].join('\n'),
      html: `
        <p>Hola ${input.name},</p>
        <p>Recibimos una solicitud para restablecer tu contraseña.</p>
        <p><a href="${input.resetUrl}">Restablecer contraseña</a></p>
        <p>Este enlace expira en 30 minutos.</p>
        <p>Si no solicitaste esto, puedes ignorar este correo.</p>
      `
    });

    return { sent: true };
  }
}
