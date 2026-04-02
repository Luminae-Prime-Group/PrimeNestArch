import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MailServiceDisabledException,
  MailSenderNotConfiguredException,
  MailContentRequiredException,
} from '../../../shared/exceptions';
import type { MailDispatchOptions, MailSendOptions } from '../mail.types';
import { MAIL_CONSTANTS } from '../../../shared/constants';

/**
 * Validates mail dispatch options against configured policies.
 * Handles:
 * - Service enablement check
 * - Sender configuration validation
 * - Content requirements
 * - Recipient normalization
 */
@Injectable()
export class MailValidationService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Validates that mail service is enabled in configuration
   */
  validateServiceEnabled(): void {
    const enabled = this.configService.get<boolean>('mail.enabled', false);
    if (!enabled) {
      throw new MailServiceDisabledException();
    }
  }

  /**
   * Validates and returns the sender address.
   * Prefers provided address, falls back to configured default.
   */
  validateAndResolveSender(providedFrom: string | undefined): string {
    const defaultFrom = this.configService.get<string>('mail.defaultFrom', '');
    const fromAddress = providedFrom ?? defaultFrom;

    if (!fromAddress) {
      throw new MailSenderNotConfiguredException();
    }

    return fromAddress;
  }

  /**
   * Validates that mail has at least one content format (text or html)
   */
  validateContentProvided(text: string | undefined, html: string | undefined): void {
    if (!text && !html) {
      throw new MailContentRequiredException();
    }
  }

  /**
   * Normalizes recipient input to array format.
   * Handles both string and array inputs.
   */
  normalizeRecipients(input: MailSendOptions['to']): string[] {
    return Array.isArray(input) ? input : [input];
  }

  /**
   * Resolves max attempts configuration
   */
  resolveMaxAttempts(provided: number | undefined): number {
    return provided ?? this.configService.get(
      'mail.maxAttempts',
      MAIL_CONSTANTS.DEFAULTS.MAX_ATTEMPTS,
    );
  }

  /**
   * Normalizes attachments, preserving only required fields
   */
  normalizeAttachments(
    attachments: MailDispatchOptions['attachments'],
  ): Array<{ filename: string; contentType: string }> | null {
    if (!attachments) return null;

    return attachments
      .filter((a) => a.contentType)
      .map((a) => ({
        filename: a.filename,
        contentType: a.contentType || '',
      }))
      .filter((a): a is { filename: string; contentType: string } => !!a.contentType);
  }
}
