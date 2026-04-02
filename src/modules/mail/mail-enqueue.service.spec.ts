import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MailEnqueueService } from './application/mail-enqueue.service';
import { MailAuditLogEntity, MailAuditStatus, MailPriority } from './entities/mail-audit-log.entity';

const mockSave = jest.fn();
const mockFindOne = jest.fn();
const mockFindOneOrFail = jest.fn();
const mockUpdate = jest.fn();
const mockCreate = jest.fn((v) => v);
const mockCacheGet = jest.fn();
const mockCacheSet = jest.fn();
const mockEmit = jest.fn();

const makeAudit = (overrides: Partial<MailAuditLogEntity> = {}): MailAuditLogEntity =>
  ({
    id: 'audit-1',
    status: MailAuditStatus.PENDING,
    priority: MailPriority.NORMAL,
    subject: 'Test',
    toRecipients: ['user@example.com'],
    fromAddress: 'no-reply@example.com',
    attempts: 0,
    maxAttempts: 3,
    ...overrides,
  }) as MailAuditLogEntity;

describe('MailEnqueueService', () => {
  let service: MailEnqueueService;
  let configGet: jest.Mock;

  beforeEach(async () => {
    configGet = jest.fn((key: string, def: unknown) => {
      const defaults: Record<string, unknown> = {
        'mail.enabled': true,
        'mail.defaultFrom': 'no-reply@example.com',
        'mail.maxAttempts': 3,
        'mail.idempotencyTtlSec': 3600,
        'mail.rateLimitEnabled': false,
      };
      return defaults[key] ?? def;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailEnqueueService,
        {
          provide: getRepositoryToken(MailAuditLogEntity),
          useValue: {
            save: mockSave,
            findOne: mockFindOne,
            findOneOrFail: mockFindOneOrFail,
            update: mockUpdate,
            create: mockCreate,
          },
        },
        { provide: CACHE_MANAGER, useValue: { get: mockCacheGet, set: mockCacheSet } },
        { provide: ConfigService, useValue: { get: configGet } },
        { provide: EventEmitter2, useValue: { emit: mockEmit } },
      ],
    }).compile();
    service = module.get(MailEnqueueService);
    jest.clearAllMocks();
    configGet = jest.fn((key: string, def: unknown) => {
      const defaults: Record<string, unknown> = {
        'mail.enabled': true,
        'mail.defaultFrom': 'no-reply@example.com',
        'mail.maxAttempts': 3,
        'mail.idempotencyTtlSec': 3600,
        'mail.rateLimitEnabled': false,
      };
      return defaults[key] ?? def;
    });
    (service as any).configService = { get: configGet };
  });

  it('throws when mail is disabled', async () => {
    configGet.mockImplementation((key: string, def: unknown) =>
      key === 'mail.enabled' ? false : def,
    );
    await expect(
      service.enqueue({ to: 'a@b.com', subject: 'Hi', text: 'body' }),
    ).rejects.toThrow('disabled');
  });

  it('throws when no from address is configured', async () => {
    configGet.mockImplementation((key: string, def: unknown) =>
      key === 'mail.defaultFrom' ? '' : key === 'mail.enabled' ? true : def,
    );
    await expect(
      service.enqueue({ to: 'a@b.com', subject: 'Hi', text: 'body' }),
    ).rejects.toThrow('sender');
  });

  it('throws when neither text nor html is provided', async () => {
    await expect(
      service.enqueue({ to: 'a@b.com', subject: 'Hi' } as any),
    ).rejects.toThrow('content format');
  });

  it('returns existing audit on idempotency cache hit', async () => {
    const existing = makeAudit();
    mockCacheGet.mockResolvedValue('audit-1');
    mockFindOne.mockResolvedValue(existing);
    const result = await service.enqueue({
      to: 'a@b.com',
      subject: 'Hi',
      text: 'body',
      idempotencyKey: 'key-1',
    });
    expect(mockSave).not.toHaveBeenCalled();
    expect(result.id).toBe('audit-1');
  });

  it('saves and emits event on successful enqueue', async () => {
    const created = makeAudit();
    mockCacheGet.mockResolvedValue(null);
    mockFindOne.mockResolvedValue(null);
    mockSave.mockResolvedValue(created);
    const result = await service.enqueue({ to: 'a@b.com', subject: 'Hi', text: 'body' });
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(mockEmit).toHaveBeenCalledWith('mail.queued', expect.objectContaining({ id: 'audit-1' }));
    expect(result.id).toBe('audit-1');
  });

  it('requeue throws when mail is not in FAILED status', async () => {
    mockFindOneOrFail.mockResolvedValue(makeAudit({ status: MailAuditStatus.SENT }));
    await expect(service.requeue('audit-1')).rejects.toThrow('FAILED');
  });

  it('requeue resets status to PENDING for a FAILED mail', async () => {
    const failed = makeAudit({ status: MailAuditStatus.FAILED, attempts: 3 });
    mockFindOneOrFail.mockResolvedValueOnce(failed).mockResolvedValueOnce({
      ...failed,
      status: MailAuditStatus.PENDING,
    });
    mockUpdate.mockResolvedValue({ affected: 1 });
    const result = await service.requeue('audit-1');
    expect(mockUpdate).toHaveBeenCalledWith(
      'audit-1',
      expect.objectContaining({ status: MailAuditStatus.PENDING }),
    );
    expect(result.status).toBe(MailAuditStatus.PENDING);
  });
});
