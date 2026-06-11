import { markPortalRuntimeStarted } from '../utils/runtime/portal-runtime'

export default defineNitroPlugin(() => {
	markPortalRuntimeStarted()
})
