import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MAIL_EVENTS, type MailEventPayload } from './mail.events';

@Injectable()
export class MailListener {
  private readonly logger = new Logger(MailListener.name);

  @OnEvent(MAIL_EVENTS.QUEUED)
  onQueued(payload: MailEventPayload) {
    this.logger.log(`mail queued id=${payload.id} attempts=${payload.attempts}`);
  }

  @OnEvent(MAIL_EVENTS.SENT)
  onSent(payload: MailEventPayload) {
    this.logger.log(`mail sent id=${payload.id} attempts=${payload.attempts}`);
  }

  @OnEvent(MAIL_EVENTS.FAILED)
  onFailed(payload: MailEventPayload) {
    this.logger.warn(`mail failed id=${payload.id} attempts=${payload.attempts} error=${payload.error ?? 'unknown'}`);
  }
}
