export type MailRecipient = string | string[];

export type MailAttachment = {
  filename: string;
  content: string | Buffer;
  contentType?: string;
};

export type MailSendOptions = {
  to: MailRecipient;
  subject: string;
  text?: string;
  html?: string;
  cc?: MailRecipient;
  bcc?: MailRecipient;
  replyTo?: string;
  from?: string;
  attachments?: MailAttachment[];
};

export type MailTemplateOptions = {
  to: MailRecipient;
  subject: string;
  template: string;
  context?: Record<string, unknown>;
  cc?: MailRecipient;
  bcc?: MailRecipient;
  replyTo?: string;
  from?: string;
  attachments?: MailAttachment[];
};

export type MailDispatchMetadata = Record<string, string | number | boolean>;

export type MailPriority = 'high' | 'normal' | 'low';

export type MailDispatchOptions = MailSendOptions & {
  correlationId?: string;
  idempotencyKey?: string;
  metadata?: MailDispatchMetadata;
  maxAttempts?: number;
  priority?: MailPriority;
};

export type MailTemplateDispatchOptions = Omit<MailTemplateOptions, 'context'> & {
  correlationId?: string;
  idempotencyKey?: string;
  metadata?: MailDispatchMetadata;
  maxAttempts?: number;
  priority?: MailPriority;
  context?: Record<string, unknown>;
};

export type MailAuditQueryOptions = {
  status?: 'pending' | 'processing' | 'sent' | 'failed';
  priority?: MailPriority;
  correlationId?: string;
  idempotencyKey?: string;
  recipient?: string;
  subject?: string;
  fromDate?: Date;
  toDate?: Date;
  page: number;
  limit: number;
  sortBy: 'createdAt' | 'updatedAt' | 'nextAttemptAt' | 'attempts' | 'sentAt' | 'failedAt';
  sortOrder: 'ASC' | 'DESC';
  includeContent: boolean;
};

export type MailAuditView = {
  id: string;
  correlationId?: string | null;
  idempotencyKey?: string | null;
  status: string;
  toRecipients: string[];
  ccRecipients?: string[] | null;
  bccRecipients?: string[] | null;
  fromAddress: string;
  subject: string;
  textBody?: string | null;
  htmlBody?: string | null;
  metadata?: Record<string, string | number | boolean> | null;
  replyTo?: string | null;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt?: Date | null;
  lockedAt?: Date | null;
  processingNode?: string | null;
  providerMessageId?: string | null;
  lastError?: string | null;
  sentAt?: Date | null;
  failedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PaginatedMailAuditResponse = {
  items: MailAuditView[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
