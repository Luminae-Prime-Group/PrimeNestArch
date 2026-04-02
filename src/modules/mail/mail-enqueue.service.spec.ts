import { Test, TestingModule } from '@nestjs/testing';
import { MailEnqueueService } from './application/mail-enqueue.service';
import { MailValidationService } from './application/mail-validation.service';
import { MailIdempotencyService } from './application/mail-idempotency.service';
import { MailRateLimitService } from './application/mail-rate-limit.service';
import { MailAuditService } from './application/mail-audit.service';
import { MailRetryService } from './application/mail-retry.service';
import { MailSuppressionService } from './application/mail-suppression.service';

const mockValidateServiceEnabled = jest.fn();
const mockValidateContentProvided = jest.fn();
const mockValidateAndResolveSender = jest.fn();
const mockNormalizeRecipients = jest.fn();
const mockResolveMaxAttempts = jest.fn();
const mockNormalizeAttachments = jest.fn();

const mockFindByIdempotencyKey = jest.fn();
const mockCacheMail = jest.fn();
const mockEnforceLimit = jest.fn();
const mockCreateAuditLog = jest.fn();
const mockPublishQueued = jest.fn();
const mockRequeue = jest.fn();
const mockEnsureRecipientsAreAllowed = jest.fn();

describe('MailEnqueueService', () => {
  let service: MailEnqueueService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailEnqueueService,
        {
          provide: MailValidationService,
          useValue: {
            validateServiceEnabled: mockValidateServiceEnabled,
            validateContentProvided: mockValidateContentProvided,
            validateAndResolveSender: mockValidateAndResolveSender,
            normalizeRecipients: mockNormalizeRecipients,
            resolveMaxAttempts: mockResolveMaxAttempts,
            normalizeAttachments: mockNormalizeAttachments,
          },
        },
        {
          provide: MailIdempotencyService,
          useValue: {
            findByIdempotencyKey: mockFindByIdempotencyKey,
            cacheMail: mockCacheMail,
          },
        },
        {
          provide: MailRateLimitService,
          useValue: {
            enforceLimit: mockEnforceLimit,
          },
        },
        {
          provide: MailAuditService,
          useValue: {
            createAuditLog: mockCreateAuditLog,
            publishQueued: mockPublishQueued,
          },
        },
        {
          provide: MailRetryService,
          useValue: {
            requeue: mockRequeue,
          },
        },
        {
          provide: MailSuppressionService,
          useValue: {
            ensureRecipientsAreAllowed: mockEnsureRecipientsAreAllowed,
          },
        },
      ],
    }).compile();

    service = module.get(MailEnqueueService);
    jest.clearAllMocks();

    mockValidateAndResolveSender.mockReturnValue('no-reply@example.com');
    mockNormalizeRecipients.mockReturnValue(['user@example.com']);
    mockResolveMaxAttempts.mockReturnValue(3);
    mockNormalizeAttachments.mockReturnValue(null);
    mockFindByIdempotencyKey.mockResolvedValue(null);
    mockCreateAuditLog.mockResolvedValue({ id: 'audit-1' });
  });

  it('enqueues a new mail and publishes queued event', async () => {
    const result = await service.enqueue({
      to: 'user@example.com',
      subject: 'Hello',
      text: 'Body',
      idempotencyKey: 'mail-1',
    });

    expect(mockValidateServiceEnabled).toHaveBeenCalled();
    expect(mockEnsureRecipientsAreAllowed).toHaveBeenCalledWith(['user@example.com']);
    expect(mockEnforceLimit).toHaveBeenCalled();
    expect(mockCreateAuditLog).toHaveBeenCalled();
    expect(mockCacheMail).toHaveBeenCalledWith('mail-1', 'audit-1');
    expect(mockPublishQueued).toHaveBeenCalledWith({ id: 'audit-1' });
    expect(result).toEqual({ id: 'audit-1' });
  });

  it('returns existing mail when idempotency key is already known', async () => {
    mockFindByIdempotencyKey.mockResolvedValue({ id: 'existing-audit' });

    const result = await service.enqueue({
      to: 'user@example.com',
      subject: 'Hello',
      text: 'Body',
      idempotencyKey: 'mail-1',
    });

    expect(mockCreateAuditLog).not.toHaveBeenCalled();
    expect(result).toEqual({ id: 'existing-audit' });
  });

  it('delegates requeue operation to MailRetryService', async () => {
    mockRequeue.mockResolvedValue({ id: 'audit-1', status: 'pending' });

    const result = await service.requeue('audit-1');

    expect(mockRequeue).toHaveBeenCalledWith('audit-1');
    expect(result).toEqual({ id: 'audit-1', status: 'pending' });
  });
});
