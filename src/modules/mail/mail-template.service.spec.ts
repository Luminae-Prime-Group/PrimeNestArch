import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailTemplateService } from './infrastructure/mail-template.service';

const mockCacheGet = jest.fn();
const mockCacheSet = jest.fn();

describe('MailTemplateService', () => {
  let service: MailTemplateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailTemplateService,
        {
          provide: CACHE_MANAGER,
          useValue: { get: mockCacheGet, set: mockCacheSet },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(300) },
        },
      ],
    }).compile();
    service = module.get(MailTemplateService);
    jest.clearAllMocks();
  });

  it('render interpolates variables using Handlebars', () => {
    const html = service.render('<h1>Hello {{name}}</h1>', { name: 'Alice' });
    expect(html).toContain('Hello Alice');
  });

  it('render supports Handlebars conditionals', () => {
    const html = service.render(
      '{{#if active}}<b>Active</b>{{else}}<b>Inactive</b>{{/if}}',
      { active: true },
    );
    expect(html).toContain('<b>Active</b>');
    expect(html).not.toContain('<b>Inactive</b>');
  });

  it('render escapes script tags in context values via Handlebars auto-escape', () => {
    const html = service.render('<p>{{msg}}</p>', {
      msg: '<script>alert("xss")</script>',
    });
    // Handlebars double-brace auto-escapes < and > so no literal script tag appears
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('</script>');
  });

  it('render strips dangerous event handlers from template', () => {
    const html = service.render('<a href="http://example.com" onclick="evil()">click</a>', {});
    expect(html).not.toContain('onclick');
    expect(html).toContain('href');
  });

  it('renderCached returns cached value without re-rendering', async () => {
    mockCacheGet.mockResolvedValue('<h1>Cached</h1>');
    const result = await service.renderCached('<h1>Fresh</h1>', {});
    expect(result).toBe('<h1>Cached</h1>');
    expect(mockCacheSet).not.toHaveBeenCalled();
  });

  it('renderCached renders and caches on cache miss', async () => {
    mockCacheGet.mockResolvedValue(undefined);
    const result = await service.renderCached('<h1>Hello {{name}}</h1>', { name: 'Bob' });
    expect(result).toContain('Hello Bob');
    expect(mockCacheSet).toHaveBeenCalledWith(
      expect.stringContaining('mail:template:'),
      expect.stringContaining('Hello Bob'),
      300,
    );
  });
});
