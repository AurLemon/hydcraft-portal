const normalizeDimensionValue = (value: string): string =>
	value
		.trim()
		.toLowerCase()
		.replace(/^\/+|\/+$/g, '')

const vanillaDimensionAliases: Record<string, string> = {
	'0': 'overworld',
	world: 'overworld',
	overworld: 'overworld',
	'minecraft:overworld': 'overworld',
	'-1': 'nether',
	world_nether: 'nether',
	nether: 'nether',
	the_nether: 'nether',
	'minecraft:the_nether': 'nether',
	'1': 'end',
	world_the_end: 'end',
	end: 'end',
	the_end: 'end',
	'minecraft:the_end': 'end',
}

const toDimensionCandidates = (value: string | null | undefined): string[] => {
	if (!value) return []

	const normalized = normalizeDimensionValue(value)
	if (!normalized) return []

	const vanillaDimension = vanillaDimensionAliases[normalized]
	if (vanillaDimension) return [vanillaDimension]

	const candidates = new Set([normalized])
	const separatorIndex = normalized.indexOf(':')
	if (separatorIndex >= 0) {
		const namespace = normalized.slice(0, separatorIndex)
		const path = normalized.slice(separatorIndex + 1)
		if (path) {
			candidates.add(path)
			candidates.add(`${namespace}_${path}`)
		}
	}

	return [...candidates]
}

/**
 * Resolves a BlueMap directory configured by an administrator from a Minecraft
 * dimension reported by Portal Bridge or playerdata. Vanilla aliases are
 * semantic; custom dimensions remain exact-first with safe naming fallbacks.
 */
export const resolveBlueMapDimensionDirectory = (
	configuredDimensions: readonly string[],
	location: { dimension?: string | null; worldName?: string | null },
): string | null => {
	const configured = configuredDimensions.flatMap((directory) => {
		const normalized = normalizeDimensionValue(directory)
		if (!normalized) return []
		return [
			{
				directory: directory.trim(),
				candidates: toDimensionCandidates(normalized),
			},
		]
	})

	for (const reportedValue of [location.dimension, location.worldName]) {
		const reportedCandidates = new Set(toDimensionCandidates(reportedValue))
		if (!reportedCandidates.size) continue

		const matched = configured.find((item) =>
			item.candidates.some((candidate) => reportedCandidates.has(candidate)),
		)
		if (matched) return matched.directory
	}

	return null
}
