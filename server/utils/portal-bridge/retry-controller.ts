export interface RetryControllerSnapshot {
	attempts: number
	maxAttempts: number | null
	nextRetryAt: Date | null
	manualRequired: boolean
}

interface RetryControllerOptions {
	// 初始延迟（首次重试后），单位 ms。
	initialDelayMs: number
	// 退避上限，单位 ms。
	maxDelayMs: number
	// jitter 占比 [0, 1]，在 base 延迟上下浮动 ±jitterRatio × base。
	jitterRatio: number
	// 最大重试次数；null 表示无限重试。达到上限后置 manualRequired 且不再调度。
	maxAttempts: number | null
}

const DEFAULT_OPTIONS: Required<Omit<RetryControllerOptions, 'maxAttempts'>> = {
	initialDelayMs: 1_000,
	maxDelayMs: 60_000,
	jitterRatio: 0.2,
}

export class RetryController {
	private timer: ReturnType<typeof setTimeout> | null = null
	private attempts = 0
	private nextRetryAt: Date | null = null
	private manualRequired = false
	private readonly resolvedOptions: Required<
		Omit<RetryControllerOptions, 'maxAttempts'>
	> &
		Pick<RetryControllerOptions, 'maxAttempts'>

	constructor(options: RetryControllerOptions) {
		this.resolvedOptions = {
			...DEFAULT_OPTIONS,
			...options,
			maxAttempts: options.maxAttempts ?? null,
		}
	}

	schedule(callback: () => void): void {
		if (this.timer || this.manualRequired) {
			return
		}

		this.attempts += 1

		// 达到最大次数：停止重试，标记需人工介入。
		if (
			this.resolvedOptions.maxAttempts != null &&
			this.attempts > this.resolvedOptions.maxAttempts
		) {
			this.manualRequired = true
			this.nextRetryAt = null
			return
		}

		const delay = this.computeDelay(this.attempts)
		this.nextRetryAt = new Date(Date.now() + delay)
		this.timer = setTimeout(() => {
			this.timer = null
			this.nextRetryAt = null
			callback()
		}, delay)
	}

	// 指数退避 + jitter：base = min(maxDelay, initial × 2^(attempts-1))，
	// jitter = base × jitterRatio × (2×rand - 1)，落在 [base×(1-r), base×(1+r)]。
	// 对齐 bridge 端 reconnect 配置语义（initial/max/jitterRatio）。
	private computeDelay(attempts: number): number {
		const { initialDelayMs, maxDelayMs, jitterRatio } = this.resolvedOptions
		const base = Math.min(maxDelayMs, initialDelayMs * 2 ** (attempts - 1))
		const jitter = base * jitterRatio * (2 * Math.random() - 1)

		return Math.max(0, Math.round(base + jitter))
	}

	reset(): void {
		this.clear()
		this.attempts = 0
		this.manualRequired = false
	}

	clear(): void {
		if (this.timer) {
			clearTimeout(this.timer)
			this.timer = null
		}

		this.nextRetryAt = null
	}

	snapshot(): RetryControllerSnapshot {
		return {
			attempts: this.attempts,
			maxAttempts: this.resolvedOptions.maxAttempts,
			nextRetryAt: this.nextRetryAt,
			manualRequired: this.manualRequired,
		}
	}
}
