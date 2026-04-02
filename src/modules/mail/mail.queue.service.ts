import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailDispatchService } from './infrastructure/mail-dispatch.service';

@Injectable()
export class MailQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MailQueueService.name);
  private intervalRef?: NodeJS.Timeout;
  private isTickRunning = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly mailDispatchService: MailDispatchService,
  ) {}

  async onModuleInit(): Promise<void> {
    const queueEnabled = this.configService.get<boolean>('mail.queueEnabled', true);
    const mailEnabled = this.configService.get<boolean>('mail.enabled', false);

    if (!queueEnabled || !mailEnabled) {
      return;
    }

    const intervalMs = this.configService.get<number>('mail.queuePollIntervalMs', 1000);
    this.intervalRef = setInterval(() => {
      void this.tick().catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'unknown queue tick error';
        this.logger.error(`mail queue tick failed: ${message}`);
      });
    }, intervalMs);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
    }
  }

  private async tick(): Promise<void> {
    if (this.isTickRunning) {
      return;
    }
    this.isTickRunning = true;

    try {
      const queueEnabled = this.configService.get<boolean>('mail.queueEnabled', true);
      if (!queueEnabled) {
        return;
      }

      const batchSize = this.configService.get<number>('mail.queueBatchSize', 20);
      const claimed = await this.mailDispatchService.claimPendingJobs(batchSize);
      if (claimed.length === 0) {
        return;
      }

      const concurrency = this.configService.get<number>('mail.queueConcurrency', 5);
      await this.runWithConcurrency(
        claimed,
        Math.max(1, concurrency),
        (item) => this.mailDispatchService.processJob(item),
      );
    } finally {
      this.isTickRunning = false;
    }
  }

  private async runWithConcurrency<T>(
    items: T[],
    concurrency: number,
    worker: (item: T) => Promise<void>,
  ): Promise<void> {
    const queue = [...items];
    const run = async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (item) {
          await worker(item);
        }
      }
    };
    await Promise.allSettled(Array.from({ length: concurrency }, run));
  }
}
