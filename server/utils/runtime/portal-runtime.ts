let portalRuntimeStartedAt = new Date()

export const markPortalRuntimeStarted = (startedAt = new Date()): void => {
	portalRuntimeStartedAt = startedAt
}

export const getPortalRuntimeStartedAt = (): Date => portalRuntimeStartedAt
