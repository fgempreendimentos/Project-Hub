type Task = () => Promise<void>;

/**
 * FIFO queue that runs one task at a time, waiting `minIntervalMs` between
 * tasks. Usado pelos Publishers (WhatsApp, Telegram, Discord) para evitar
 * flood e reduzir risco de rate limit/banimento nos canais de envio.
 */
export class RateLimitedQueue {
  private readonly tasks: Task[] = [];
  private processing = false;

  constructor(private readonly minIntervalMs: number) {}

  enqueue(task: Task): void {
    this.tasks.push(task);
    void this.process();
  }

  get size(): number {
    return this.tasks.length;
  }

  private async process(): Promise<void> {
    if (this.processing) {
      return;
    }
    this.processing = true;

    while (this.tasks.length > 0) {
      const task = this.tasks.shift();
      if (!task) {
        continue;
      }
      await task();
      if (this.tasks.length > 0) {
        await this.wait(this.minIntervalMs);
      }
    }

    this.processing = false;
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
