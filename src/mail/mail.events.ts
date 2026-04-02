export const MAIL_EVENTS = {
  QUEUED: 'mail.queued',
  PROCESSING: 'mail.processing',
  SENT: 'mail.sent',
  FAILED: 'mail.failed',
} as const;

export type MailEventName = (typeof MAIL_EVENTS)[keyof typeof MAIL_EVENTS];

export type MailEventPayload = {
  id: string;
  correlationId?: string | null;
  idempotencyKey?: string | null;
  status: string;
  attempts: number;
  subject: string;
  to: string[];
  error?: string | null;
};
