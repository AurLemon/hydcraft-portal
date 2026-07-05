import 'dotenv/config'
import { existsSync } from 'node:fs'

const aliasEnv = (targetKey, sourceKeys) => {
	if (process.env[targetKey]?.trim()) {
		return
	}

	for (const sourceKey of sourceKeys) {
		const value = process.env[sourceKey]?.trim()

		if (value) {
			process.env[targetKey] = value
			return
		}
	}
}

// Bridge legacy env names to Nuxt runtimeConfig keys before Nitro boots.
aliasEnv('NUXT_AFDIAN_USER_ID', ['AFDIAN_USER_ID'])
aliasEnv('NUXT_AFDIAN_API_KEY', ['AFDIAN_API_KEY'])
aliasEnv('NUXT_AFDIAN_BASE_URL', ['AFDIAN_BASE_URL'])

aliasEnv('NUXT_CAP_BASE_URL', ['CAP_BASE_URL'])

aliasEnv('NUXT_COS_SECRET_ID', ['COS_SECRET_ID'])
aliasEnv('NUXT_COS_SECRET_KEY', ['COS_SECRET_KEY'])
aliasEnv('NUXT_COS_REGION', ['COS_REGION'])
aliasEnv('NUXT_COS_ATTACHMENTS_BUCKET', ['COS_ATTACHMENTS_BUCKET'])
aliasEnv('NUXT_COS_PUBLIC_BASE_URL', ['COS_PUBLIC_BASE_URL'])

aliasEnv('NUXT_PUBLIC_SITE_URL', ['NUXT_SITE_URL'])
aliasEnv('NUXT_PUBLIC_CAP_BASE_URL', ['CAP_BASE_URL'])
aliasEnv('NUXT_PUBLIC_MINECRAFT_MAP_DYNMAP_TILE_BASE_URL', [
	'MINECRAFT_MAP_DYNMAP_TILE_BASE_URL',
])
aliasEnv('NUXT_PUBLIC_MINECRAFT_MAP_DYNMAP_WORLD_NAME', [
	'MINECRAFT_MAP_DYNMAP_WORLD_NAME',
])
aliasEnv('NUXT_PUBLIC_MINECRAFT_MAP_DYNMAP_MAP_NAME', [
	'MINECRAFT_MAP_DYNMAP_MAP_NAME',
])
aliasEnv('NUXT_PUBLIC_MINECRAFT_MAP_DYNMAP_TILE_EXTENSION', [
	'MINECRAFT_MAP_DYNMAP_TILE_EXTENSION',
])
aliasEnv('NUXT_PUBLIC_MINECRAFT_MAP_DEFAULT_CENTER_X', [
	'MINECRAFT_MAP_DEFAULT_CENTER_X',
])
aliasEnv('NUXT_PUBLIC_MINECRAFT_MAP_DEFAULT_CENTER_Z', [
	'MINECRAFT_MAP_DEFAULT_CENTER_Z',
])
aliasEnv('NUXT_PUBLIC_MINECRAFT_MAP_DEFAULT_ZOOM', [
	'MINECRAFT_MAP_DEFAULT_ZOOM',
])

const serverEntryPath = existsSync(
	new URL('./server/index.mjs', import.meta.url),
)
	? './server/index.mjs'
	: './.output/server/index.mjs'

await import(serverEntryPath)
