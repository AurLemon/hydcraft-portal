import {
	lookupIpLocation,
	normalizeIpAddressForDisplay,
} from '../ip-location/ip-location'

export interface MinecraftAuthMeActivitySource {
	lastLoginAt: Date | null
	lastIp: string | null
	registeredAt: Date | null
	registerIp: string | null
}

export interface MinecraftAuthMeActivityEntry {
	at: string | null
	ipAddress: string | null
	ipLocation: string | null
}

export interface MinecraftAuthMeActivitySummary {
	lastLogin: MinecraftAuthMeActivityEntry | null
	registration: MinecraftAuthMeActivityEntry | null
}

export const buildMinecraftAuthMeActivitySummary = async (
	authMeAccount: MinecraftAuthMeActivitySource | null | undefined,
): Promise<MinecraftAuthMeActivitySummary> => {
	if (!authMeAccount) {
		return {
			lastLogin: null,
			registration: null,
		}
	}

	const [lastLoginLocation, registrationLocation] = await Promise.all([
		lookupIpLocation(authMeAccount.lastIp),
		lookupIpLocation(authMeAccount.registerIp),
	])

	return {
		lastLogin: {
			at: authMeAccount.lastLoginAt?.toISOString() ?? null,
			ipAddress:
				normalizeIpAddressForDisplay(authMeAccount.lastIp) ??
				authMeAccount.lastIp,
			ipLocation: lastLoginLocation?.display ?? null,
		},
		registration: {
			at: authMeAccount.registeredAt?.toISOString() ?? null,
			ipAddress:
				normalizeIpAddressForDisplay(authMeAccount.registerIp) ??
				authMeAccount.registerIp,
			ipLocation: registrationLocation?.display ?? null,
		},
	}
}
