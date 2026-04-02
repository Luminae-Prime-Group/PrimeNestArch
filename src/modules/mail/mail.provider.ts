import { ConfigService } from '@nestjs/config';
import { createTransport, type TransportOptions, type Transporter } from 'nodemailer';
import { MAIL_TRANSPORTER } from './mail.constants';

export const mailTransporterProvider = {
  provide: MAIL_TRANSPORTER,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): Transporter => {
    const enabled = configService.get<boolean>('mail.enabled', false);

    if (!enabled) {
      return createTransport({ jsonTransport: true });
    }

    const transport: TransportOptions = {
      host: configService.get<string>('mail.host', 'localhost'),
      port: configService.get<number>('mail.port', 587),
      secure: configService.get<boolean>('mail.secure', false),
      pool: configService.get<boolean>('mail.pool', true),
      maxConnections: configService.get<number>('mail.maxConnections', 5),
      maxMessages: configService.get<number>('mail.maxMessages', 100),
      connectionTimeout: configService.get<number>('mail.connectionTimeoutMs', 10000),
      greetingTimeout: configService.get<number>('mail.greetingTimeoutMs', 10000),
      socketTimeout: configService.get<number>('mail.socketTimeoutMs', 15000),
      requireTLS: configService.get<boolean>('mail.requireTls', true),
      tls: {
        rejectUnauthorized: configService.get<boolean>('mail.rejectUnauthorized', true),
      },
    };

    const username = configService.get<string>('mail.user', '');
    const password = configService.get<string>('mail.password', '');

    if (username && password) {
      transport.auth = {
        user: username,
        pass: password,
      };
    }

    return createTransport(transport);
  },
};
