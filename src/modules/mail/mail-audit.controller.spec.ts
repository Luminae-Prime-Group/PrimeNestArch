import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { MailAuditController } from './presentation/mail-audit.controller';
import { MailService } from './mail.service';
import { MailAuditLogEntity, MailAuditStatus, MailPriority } from './entities/mail-audit-log.entity';

const mockSearch = jest.fn();
const mockFindById = jest.fn();
const mockRetryFailed = jest.fn();
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
