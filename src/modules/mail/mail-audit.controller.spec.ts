import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { MailAuditController } from './presentation/mail-audit.controller';
import { MailService } from './mail.service';
import { MailAuditLogEntity, MailAuditStatus, MailPriority } from './entities/mail-audit-log.entity';

const mockSearch = jest.fn();
const mockFindById = jest.fn();
const mockRetryFailed = jest.fn();
const mockSendAsync = jest.fn();
const mockSendTemplateAsync = jest.fn();
const mockScheduleAsync = jest.fn();
const mockSuppressRecipient = jest.fn();
const mockUnsuppressRecipient = jest.fn();
const mockListSuppressed = jest.fn();
const mockPreviewTemplate = jest.fn();

const fakeAudit = (): Partial<MailAuditLogEntity> => ({
  id: 'audit-1',
  status: MailAuditStatus.PENDING,
  priority: MailPriority.NORMAL,
  subject: 'Test Subject',
  toRecipients: ['user@example.com'],
});

describe('MailAuditController', () => {
  let controller: MailAuditController;
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    configService = { get: jest.fn().mockReturnValue('development') };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MailAuditController],
      providers: [
        {
          provide: MailService,
          useValue: {
            searchAudit: mockSearch,
            findAuditById: mockFindById,
            retryFailed: mockRetryFailed,
            sendAsync: mockSendAsync,
            sendTemplateAsync: mockSendTemplateAsync,
            scheduleAsync: mockScheduleAsync,
            suppressRecipient: mockSuppressRecipient,
            unsuppressRecipient: mockUnsuppressRecipient,
            listSuppressed: mockListSuppressed,
            previewTemplate: mockPreviewTemplate,
          },
        },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();
    controller = module.get(MailAuditController);
    jest.clearAllMocks();
  });

  it('list maps DTO and calls searchAudit', async () => {
    mockSearch.mockResolvedValue({ items: [fakeAudit()], total: 1, page: 1, limit: 20, totalPages: 1 });
    const result = await controller.list({
      status: undefined,
      priority: undefined,
      correlationId: undefined,
      idempotencyKey: undefined,
      recipient: undefined,
      subject: undefined,
      fromDate: undefined,
      toDate: undefined,
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'DESC',
      includeContent: false,
    });
    expect(mockSearch).toHaveBeenCalled();
    expect(result.items).toHaveLength(1);
  });

  it('detail calls findAuditById with includeContent=false by default', async () => {
    mockFindById.mockResolvedValue(fakeAudit());
    await controller.detail('audit-1');
    expect(mockFindById).toHaveBeenCalledWith('audit-1', false);
  });

  it('detail passes includeContent=true when query param is "true"', async () => {
    mockFindById.mockResolvedValue(fakeAudit());
    await controller.detail('audit-1', 'true');
    expect(mockFindById).toHaveBeenCalledWith('audit-1', true);
  });

  it('retry delegates to mailService.retryFailed', async () => {
    mockRetryFailed.mockResolvedValue(fakeAudit());
    await controller.retry('audit-1');
    expect(mockRetryFailed).toHaveBeenCalledWith('audit-1');
  });

  it('send delegates to mailService.sendAsync', async () => {
    mockSendAsync.mockResolvedValue(fakeAudit());
    const payload = {
      to: ['user@example.com'],
      subject: 'Welcome',
      text: 'Hello',
    };

    await controller.send(payload);

    expect(mockSendAsync).toHaveBeenCalledWith(expect.objectContaining(payload));
  });

  it('send throws when text and html are both missing', async () => {
    await expect(
      controller.send({ to: ['user@example.com'], subject: 'Welcome' } as any),
    ).rejects.toThrow('At least one content format');
  });

  it('sendTemplate delegates to mailService.sendTemplateAsync', async () => {
    mockSendTemplateAsync.mockResolvedValue(fakeAudit());
    const payload = {
      to: ['user@example.com'],
      subject: 'Welcome',
      template: '<h1>Hello {{name}}</h1>',
      context: { name: 'Giovani' },
    };

    await controller.sendTemplate(payload);

    expect(mockSendTemplateAsync).toHaveBeenCalledWith(expect.objectContaining(payload));
  });

  it('schedule delegates to mailService.scheduleAsync with parsed date', async () => {
    mockScheduleAsync.mockResolvedValue(fakeAudit());
    const payload = {
      to: ['user@example.com'],
      subject: 'Scheduled email',
      text: 'Hello',
      scheduledFor: '2099-04-02T22:30:00.000Z',
    };

    await controller.schedule(payload);

    expect(mockScheduleAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        scheduledAt: expect.any(Date),
      }),
    );
  });

  it('schedule throws when scheduledFor is not in the future', async () => {
    await expect(
      controller.schedule({
        to: ['user@example.com'],
        subject: 'Scheduled email',
        text: 'Hello',
        scheduledFor: '2000-01-01T00:00:00.000Z',
      } as any),
    ).rejects.toThrow('scheduledFor must be a future date-time');
  });

  it('suppression routes delegate to mail service', async () => {
    mockSuppressRecipient.mockResolvedValue({ email: 'user@example.com', active: true });
    mockUnsuppressRecipient.mockResolvedValue({ updated: true });
    mockListSuppressed.mockResolvedValue([]);

    await controller.suppress({ email: 'user@example.com' });
    await controller.unsuppress('user@example.com');
    await controller.listSuppression('10');

    expect(mockSuppressRecipient).toHaveBeenCalledWith('user@example.com', undefined, undefined);
    expect(mockUnsuppressRecipient).toHaveBeenCalledWith('user@example.com');
    expect(mockListSuppressed).toHaveBeenCalledWith(10);
  });

  it('preview returns html in development', () => {
    mockPreviewTemplate.mockReturnValue({ html: '<h1>OK</h1>' });
    configService.get.mockReturnValue('development');
    const result = controller.preview({ template: '<h1>OK</h1>', context: {} });
    expect(result).toEqual({ html: '<h1>OK</h1>' });
  });

  it('preview throws NotFoundException in production', () => {
    configService.get.mockReturnValue('production');
    expect(() => controller.preview({ template: '<h1>OK</h1>' })).toThrow(NotFoundException);
  });
});
