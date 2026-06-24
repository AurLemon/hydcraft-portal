import { PortalBridgeManager } from './client-manager'

export type { PortalBridgeRuntimeSnapshot as PortalBridgeRuntimeStatus } from './client-types'

export const portalBridgeManager = new PortalBridgeManager()
