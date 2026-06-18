import { runPortalBridgeRetention } from '../utils/portal-bridge/retention'

// PortalBridge retention 调度：每小时清理一次 append-only 的回执/终态命令/快照。
// 频率低、删除量小，用 setInterval 直接调核心逻辑（不经 Nitro task 路由，避免 HTTP 开销）。
const RETENTION_INTERVAL_MS = 60 * 60 * 1000

export default defineNitroPlugin(() => {
	if (
		import.meta.prerender ||
		process.env.HYDCRAFT_DISABLE_PORTAL_BRIDGE === '1'
	) {
		return
	}

	const timer = setInterval(() => {
		void runPortalBridgeRetention().catch((error) => {
			console.error('[portal-bridge] retention run failed', error)
		})
	}, RETENTION_INTERVAL_MS)

	// Nitro 不提供 shutdown hook，进程退出时 timer 自然回收。
	if (typeof timer.unref === 'function') {
		timer.unref()
	}
})
