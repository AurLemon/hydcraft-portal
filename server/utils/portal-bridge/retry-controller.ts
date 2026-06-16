export interface RetryControllerSnapshot {
	attempts: number
	maxAttempts: number
	nextRetryAt: Date | null
	manualRequired: boolean
}

interface RetryControllerOptions {
	intervalMs: number
	maxAttempts: number
}

export class RetryController {
	private timer: ReturnType<typeof setTimeout> | null = null
	private attempts = 0
	private nextRetryAt: Date | null = null
	private manualRequired = false

	constructor(private readonly options: RetryControllerOptions) {}

	schedule(callback: () => void): void {
		if (this.timer || this.manualRequired) {
			return
		}

		if (this.attempts >= this.options.maxAttempts) {
			this.manualRequired = true
			this.nextRetryAt = null
			return
		}

		this.attempts += 1
		this.nextRetryAt = new Date(Date.now() + this.options.intervalMs)
		this.timer = setTimeout(() => {
			this.timer = null
			this.nextRetryAt = null
			callback()
		}, this.options.intervalMs)
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
			maxAttempts: this.options.maxAttempts,
			nextRetryAt: this.nextRetryAt,
			manualRequired: this.manualRequired,
		}
	}
}
