import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';
import { MailEnqueueService } from './application/mail-enqueue.service';
import { MailAuditQueryService } from './application/mail-audit-query.service';
import { MailSuppressionService } from './application/mail-suppression.service';
import { MailWebhookService } from './application/mail-webhook.service';
import { MailTemplateService } from './infrastructure/mail-template.service';
import { MailAuditLogEntity, MailAuditStatus, MailPriority } from './entities/mail-audit-log.entity';

const mockEnqueue = jest.fn();
const mockRequeue = jest.fn();
const mockFindById = jest.fn();
const mockSearch = jest.fn();
const mockRenderCached = jest.fn();
const mockRender = jest.fn();
const mockSuppress = jest.fn();
const mockUnsuppress = jest.fn();
const mockListSuppressed = jest.fn();
const mockProcessWebhook = jest.fn();

const fakeAudit = (): Partial<MailAuditLogEntity> => ({
  id: 'audit-1',
  status: MailAuditStatus.PENDING,
  priority: MailPriority.NORMAL,
  subject: 'Test',
  toRecipients: ['user@example.com'],
});

describe('MailService', () => {
  let service: MailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: MailEnqueueService, useValue: { enqueue: mockEnqueue, requeue: mockRequeue } },
        {
          provide: MailAuditQueryService,
          useValue: { findById: mockFindById, listRecent: jest.fn(), search: mockSearch },
        },
        { provide: MailTemplateService, useValue: { renderCached: mockRenderCached, render: mockRender } },
        {
          provide: MailSuppressionService,
          useValue: {
            suppress: mockSuppress,
            unsuppress: mockUnsuppress,
            listActive: mockListSuppressed,
          },
        },
        {
          provide: MailWebhookService,
          useValue: {
            processDeliveryEvent: mockProcessWebhook,
          },
        },
      ],
    }).compile();
    service = module.get(MailService);
    jest.clearAllMocks();
  });

  it('sendAsync delegates to enqueueService.enqueue', async () => {
    mockEnqueue.mockResolvedValue(fakeAudit());
    const result = await service.sendAsync({ to: 'a@b.com', subject: 'hi', text: 'body' });
    expect(mockEnqueue).toHaveBeenCalledWith(expect.objectContaining({ to: 'a@b.com' }));
    expect(result).toMatchObject({ id: 'audit-1' });
  });

  it('scheduleAsync delegates to enqueueService.enqueue', async () => {
    mockEnqueue.mockResolvedValue(fakeAudit());
    const result = await service.scheduleAsync({
      to: 'a@b.com',
      subject: 'scheduled',
      text: 'body',
      scheduledAt: new Date('2099-01-01T00:00:00.000Z'),
    });
    expect(mockEnqueue).toHaveBeenCalledWith(expect.objectContaining({ subject: 'scheduled' }));
    expect(result).toMatchObject({ id: 'audit-1' });
  });

  it('sendTemplateAsync renders template then enqueues', async () => {
    mockRenderCached.mockResolvedValue('<h1>Hello World</h1>');
    mockEnqueue.mockResolvedValue(fakeAudit());
    await service.sendTemplateAsync({
      to: 'a@b.com',
      subject: 'hi',
      template: '<h1>Hello {{name}}</h1>',
      context: { name: 'World' },
    });
    expect(mockRenderCached).toHaveBeenCalledWith('<h1>Hello {{name}}</h1>', { name: 'World' });
    expect(mockEnqueue).toHaveBeenCalledWith(expect.objectContaining({ html: '<h1>Hello World</h1>' }));
  });

  it('retryFailed delegates to enqueueService.requeue', async () => {
    mockRequeue.mockResolvedValue(fakeAudit());
    await service.retryFailed('audit-1');
    expect(mockRequeue).toHaveBeenCalledWith('audit-1');
  });

  it('previewTemplate returns rendered html without throwing', () => {
    mockRender.mockReturnValue('<h1>Hello</h1>');
    const result = service.previewTemplate('<h1>Hello</h1>', {});
    expect(result).toEqual({ html: '<h1>Hello</h1>' });
  });

  it('findAuditById delegates to auditQueryService.findById', async () => {
    mockFindById.mockResolvedValue(fakeAudit());
    await service.findAuditById('audit-1', true);
    expect(mockFindById).toHaveBeenCalledWith('audit-1', true);
  });

  it('searchAudit delegates to auditQueryService.search', async () => {
    const opts = {
      page: 1,
      limit: 10,
      sortBy: 'createdAt' as const,
      sortOrder: 'DESC' as const,
      includeContent: false,
    };
    mockSearch.mockResolvedValue({ items: [], total: 0, page: 1, limit: 10, totalPages: 0 });
    await service.searchAudit(opts);
    expect(mockSearch).toHaveBeenCalledWith(opts);
  });

  it('suppression helpers delegate to suppression service', async () => {
    mockSuppress.mockResolvedValue({ email: 'user@example.com', active: true });
    mockUnsuppress.mockResolvedValue({ updated: true });
    mockListSuppressed.mockResolvedValue([{ email: 'user@example.com', active: true }]);

    await service.suppressRecipient('user@example.com', 'manual', 'admin');
    await service.unsuppressRecipient('user@example.com');
    await service.listSuppressed(10);

    expect(mockSuppress).toHaveBeenCalledWith('user@example.com', 'manual', 'admin');
    expect(mockUnsuppress).toHaveBeenCalledWith('user@example.com');
    expect(mockListSuppressed).toHaveBeenCalledWith(10);
  });

  it('processDeliveryWebhook delegates to webhook service', async () => {
    mockProcessWebhook.mockResolvedValue(fakeAudit());
    await service.processDeliveryWebhook({ event: 'delivered', auditId: 'audit-1' });
    expect(mockProcessWebhook).toHaveBeenCalledWith({ event: 'delivered', auditId: 'audit-1' });
  });
});
