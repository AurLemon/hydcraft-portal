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
		}
	}

	return {
		src: resolveContentImageSrc(image.src),
		alt: image.alt ?? `Content image ${index + 1}`,
		caption: image.caption ?? '',
		width: image.width ?? defaultWidth,
		height: image.height ?? defaultHeight,
	}
}
