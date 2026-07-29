import { requireAdminUser } from '../../../utils/auth/session'
import {
	createMinecraftServer,
	type CreateMinecraftServerInput,
} from '../../../utils/minecraft/server-management'

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	const result = await createMinecraftServer(
		await readBody<CreateMinecraftServerInput>(event),
	)

	return { server: result.server }
})
