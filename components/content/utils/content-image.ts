const contentImageModules = import.meta.glob<string>(
	'~/assets/resources/content/**/*.{avif,gif,jpeg,jpg,png,svg,webp}',
	{
		eager: true,
		import: 'default',
	},
)

export interface ContentImageItem {
	src: string
	alt?: string
	caption?: string
	width?: string
	height?: string
}

export interface NormalizedContentImageItem {
	src: string
	alt: string
	caption: string
	width: string
	height: string
	aspectRatio: number | null
}

const parseAspectRatio = (
	width: string | undefined,
	height: string | undefined,
): number | null => {
	if (!width || !height) {
		return null
	}

	const widthMatch = width.trim().match(/^(-?\d+(?:\.\d+)?)([a-z%]*)$/i)
	const heightMatch = height.trim().match(/^(-?\d+(?:\.\d+)?)([a-z%]*)$/i)

	if (!widthMatch || !heightMatch) {
		return null
	}

	const widthValue = widthMatch[1]
	const widthUnit = widthMatch[2] ?? ''
	const heightValue = heightMatch[1]
	const heightUnit = heightMatch[2] ?? ''

	if (!widthValue || !heightValue || widthUnit !== heightUnit) {
		return null
	}

	const parsedWidth = Number.parseFloat(widthValue)
	const parsedHeight = Number.parseFloat(heightValue)

	if (
		!Number.isFinite(parsedWidth) ||
		!Number.isFinite(parsedHeight) ||
		parsedWidth <= 0 ||
		parsedHeight <= 0
	) {
		return null
	}

	return parsedWidth / parsedHeight
}

const contentImageMap = Object.fromEntries(
	Object.entries(contentImageModules).flatMap(([path, url]) => {
		const normalizedPath = path
			.replace(/^.*\/assets\/resources\/content\//, '')
			.replace(/^\//, '')
		const filename = normalizedPath.split('/').at(-1) ?? normalizedPath

		return [
			[normalizedPath, url],
			[`content/${normalizedPath}`, url],
			[filename, url],
		]
	}),
) as Record<string, string>

export const resolveContentImageSrc = (src: string): string => {
	return contentImageMap[src] ?? src
}

export const parseContentImages = (
	images: string | Array<string | ContentImageItem>,
): Array<string | ContentImageItem> => {
	if (typeof images !== 'string') {
		return images
	}

	try {
		const parsedImages: unknown = JSON.parse(images)

		if (Array.isArray(parsedImages)) {
			return parsedImages.filter(
				(image): image is string | ContentImageItem =>
					typeof image === 'string' ||
					(typeof image === 'object' &&
						image !== null &&
						typeof (image as ContentImageItem).src === 'string'),
			)
		}
	} catch {
		return [images]
	}

	return [images]
}

export const normalizeContentImage = (
	image: string | ContentImageItem,
	index: number,
	defaultWidth: string,
	defaultHeight: string,
): NormalizedContentImageItem => {
	if (typeof image === 'string') {
		return {
			src: resolveContentImageSrc(image),
			alt: `Content image ${index + 1}`,
			caption: '',
			width: defaultWidth,
			height: defaultHeight,
			aspectRatio: parseAspectRatio(defaultWidth, defaultHeight),
		}
	}

	const width = image.width ?? defaultWidth
	const height = image.height ?? defaultHeight

	return {
		src: resolveContentImageSrc(image.src),
		alt: image.alt ?? `Content image ${index + 1}`,
		caption: image.caption ?? '',
		width,
		height,
		aspectRatio: parseAspectRatio(width, height),
	}
}
