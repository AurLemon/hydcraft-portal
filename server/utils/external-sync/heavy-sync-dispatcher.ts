/**
 * Heavy sync dispatcher
 *
 * This module serializes heavy external sync workloads per Minecraft server.
 * AuthMe, LuckPerms and PortalBridge core sync all compete for the same
 * per-server lane so that interval collisions do not fan out into concurrent
 * pulls against external systems.
 *
 * PortalBridge players sync is intentionally excluded from this dispatcher.
 * It is a lightweight high-frequency loop with its own cadence and should not
 * be blocked by the heavy sync lane.
 */

interface HeavySyncJob {
	jobKey: string
	handler: () => Promise<unknown>
	resolve: (value: unknown | null) => void
	reject: (error: unknown) => void
}

class HeavySyncLane {
	private queue: HeavySyncJob[] = []
	private pendingKeys = new Set<string>()
	private running = false

	enqueue<T>(jobKey: string, handler: () => Promise<T>): Promise<T | null> {
		if (this.pendingKeys.has(jobKey)) {
			return Promise.resolve(null)
		}

		this.pendingKeys.add(jobKey)

		return new Promise<T | null>((resolve, reject) => {
			this.queue.push({
				jobKey,
				handler,
				resolve: (value) => resolve(value as T | null),
				reject,
			})
			void this.drain()
		})
	}

	private async drain(): Promise<void> {
		if (this.running) {
			return
		}

		this.running = true

		try {
			while (this.queue.length > 0) {
				const job = this.queue.shift()

				if (!job) {
					continue
				}

				try {
					const result = await job.handler()
					job.resolve(result)
				} catch (error) {
					job.reject(error)
				} finally {
					this.pendingKeys.delete(job.jobKey)
				}
			}
		} finally {
			this.running = false
		}
	}
}

class HeavySyncDispatcher {
	private lanes = new Map<string, HeavySyncLane>()

	enqueue<T>(serverId: string, jobKey: string, handler: () => Promise<T>) {
		const lane = this.getLane(serverId)

		return lane.enqueue(jobKey, handler)
	}

	private getLane(serverId: string): HeavySyncLane {
		let lane = this.lanes.get(serverId)

		if (!lane) {
			lane = new HeavySyncLane()
			this.lanes.set(serverId, lane)
		}

		return lane
	}
}

export const heavySyncDispatcher = new HeavySyncDispatcher()
