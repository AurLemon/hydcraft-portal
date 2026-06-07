import { registerMinecraftProjectionHandlers } from '../utils/minecraft/identity-projection'

export default defineNitroPlugin(() => {
	registerMinecraftProjectionHandlers()
})
