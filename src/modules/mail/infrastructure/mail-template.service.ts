import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Handlebars from 'handlebars';
import { createHash } from 'node:crypto';
import sanitizeHtml from 'sanitize-html';
import type { Cache } from 'cache-manager';

const EMAIL_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li',
    'h1', 'h2', 'h3', 'h4', 'div', 'span', 'table', 'thead', 'tbody',
    'tr', 'th', 'td', 'img', 'blockquote', 'hr',
  ],
  allowedAttributes: {
    '*': ['style', 'class'],
    a: ['href', 'name', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  disallowedTagsMode: 'discard',
};

@Injectable()
export class MailTemplateService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
  ) {}

  render(template: string, context: Record<string, unknown>): string {
    const compiled = Handlebars.compile(template);
    const raw = compiled(context);
    return sanitizeHtml(raw, EMAIL_SANITIZE_OPTIONS);
  }

  async renderCached(template: string, context: Record<string, unknown>): Promise<string> {
    const key = this.getCacheKey(template, context);
    const cached = await this.cacheManager.get<string>(key);
    if (cached) {
      return cached;
    }
    const rendered = this.render(template, context);
    const ttl = this.configService.get<number>('mail.templateCacheTtlSec', 300);
    await this.cacheManager.set(key, rendered, ttl);
    return rendered;
  }

  private getCacheKey(template: string, context: Record<string, unknown>): string {
    const digest = createHash('sha256')
      .update(template)
      .update(JSON.stringify(context))
      .digest('hex');
    return `mail:template:${digest}`;
  }
}
