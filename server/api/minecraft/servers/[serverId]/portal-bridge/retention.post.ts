import { requireAdminUser } from '../../../../../utils/auth/session'
import {
	runPortalBridgeRetention,
	resolvePortalBridgeRetentionConfig,
} from '../../../../../utils/portal-bridge/retention'

// 手动触发 PortalBridge retention 清理（admin 用）。retention 是全局的，不按 server 区分，
// 但挂在 server 路径下与其它 portal-bridge 操作一致；serverId 仅用于鉴权上下文。
export default defineEventHandler(async (event) => {
	await requireAdminUser(event)

	const config = resolvePortalBridgeRetentionConfig()
	const result = await runPortalBridgeRetention(config)

	return {
		config,
		result,
	}
})
