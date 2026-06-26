import {
	DEFAULT_SERVER_OVERVIEW_PLAYER_ACCENT,
	type ServerOverviewRgbColor,
} from '~/utils/server/overview'

const clampColorChannel = (value: number): number =>
	Math.min(255, Math.max(0, Math.round(value)))

const rgbToHsl = ({ r, g, b }: ServerOverviewRgbColor) => {
	const red = r / 255
	const green = g / 255
	const blue = b / 255
	const max = Math.max(red, green, blue)
	const min = Math.min(red, green, blue)
	const lightness = (max + min) / 2

	if (max === min) {
		return {
			hue: 0,
			saturation: 0,
			lightness,
		}
	}

	const delta = max - min
	const saturation =
		lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min)

	let hue = 0
	switch (max) {
		case red:
			hue = (green - blue) / delta + (green < blue ? 6 : 0)
			break
		case green:
			hue = (blue - red) / delta + 2
			break
		default:
			hue = (red - green) / delta + 4
			break
	}

	return {
		hue: hue / 6,
		saturation,
		lightness,
	}
}

const hueToRgb = (p: number, q: number, t: number): number => {
	let channel = t
	if (channel < 0) {
		channel += 1
	}
	if (channel > 1) {
		channel -= 1
	}
	if (channel < 1 / 6) {
		return p + (q - p) * 6 * channel
	}
	if (channel < 1 / 2) {
		return q
	}
	if (channel < 2 / 3) {
		return p + (q - p) * (2 / 3 - channel) * 6
	}
	return p
}

const hslToRgb = ({
	hue,
	saturation,
	lightness,
}: {
	hue: number
	saturation: number
	lightness: number
}): ServerOverviewRgbColor => {
	if (saturation === 0) {
		const channel = clampColorChannel(lightness * 255)
		return {
			r: channel,
			g: channel,
			b: channel,
		}
	}

	const q =
		lightness < 0.5
			? lightness * (1 + saturation)
			: lightness + saturation - lightness * saturation
	const p = 2 * lightness - q

	return {
		r: clampColorChannel(hueToRgb(p, q, hue + 1 / 3) * 255),
		g: clampColorChannel(hueToRgb(p, q, hue) * 255),
		b: clampColorChannel(hueToRgb(p, q, hue - 1 / 3) * 255),
	}
}

const normalizeAccentColor = (
	color: ServerOverviewRgbColor,
): ServerOverviewRgbColor => {
	const hsl = rgbToHsl(color)

	return hslToRgb({
		hue: hsl.hue,
		saturation: Math.max(hsl.saturation, 0.28),
		lightness: Math.min(Math.max(hsl.lightness, 0.5), 0.68),
	})
}

const getPixelWeight = (r: number, g: number, b: number): number => {
	const red = r / 255
	const green = g / 255
	const blue = b / 255
	const max = Math.max(red, green, blue)
	const min = Math.min(red, green, blue)
	const delta = max - min
	const lightness = (max + min) / 2
	const vividness = delta

	if (lightness < 0.08 || lightness > 0.92 || vividness < 0.04) {
		return 0
	}

	return 0.35 + vividness * 0.9 + (0.5 - Math.abs(lightness - 0.5)) * 0.4
}

export const extractAccentColorFromSkinImage = (
	image: HTMLImageElement,
): ServerOverviewRgbColor => {
	const canvas = document.createElement('canvas')
	const width = image.naturalWidth || image.width || 64
	const height = image.naturalHeight || image.height || 64
	canvas.width = width
	canvas.height = height

	const context = canvas.getContext('2d', {
		willReadFrequently: true,
	})

	if (!context) {
		return { ...DEFAULT_SERVER_OVERVIEW_PLAYER_ACCENT }
	}

	context.drawImage(image, 0, 0, width, height)
	const { data } = context.getImageData(0, 0, width, height)
	let weightedRed = 0
	let weightedGreen = 0
	let weightedBlue = 0
	let totalWeight = 0
	let fallbackRed = 0
	let fallbackGreen = 0
	let fallbackBlue = 0
	let fallbackCount = 0

	for (let index = 0; index < data.length; index += 16) {
		const red = data[index] ?? 0
		const green = data[index + 1] ?? 0
		const blue = data[index + 2] ?? 0
		const alpha = data[index + 3] ?? 0

		if (alpha < 96) {
			continue
		}

		fallbackRed += red
		fallbackGreen += green
		fallbackBlue += blue
		fallbackCount += 1

		const weight = getPixelWeight(red, green, blue)

		if (weight <= 0) {
			continue
		}

		weightedRed += red * weight
		weightedGreen += green * weight
		weightedBlue += blue * weight
		totalWeight += weight
	}

	if (totalWeight > 0) {
		return normalizeAccentColor({
			r: weightedRed / totalWeight,
			g: weightedGreen / totalWeight,
			b: weightedBlue / totalWeight,
		})
	}

	if (fallbackCount > 0) {
		return normalizeAccentColor({
			r: fallbackRed / fallbackCount,
			g: fallbackGreen / fallbackCount,
			b: fallbackBlue / fallbackCount,
		})
	}

	return { ...DEFAULT_SERVER_OVERVIEW_PLAYER_ACCENT }
}

export const loadSkinAccentColor = async (
	skinUrl: string,
): Promise<ServerOverviewRgbColor> => {
	if (!import.meta.client || !skinUrl) {
		return { ...DEFAULT_SERVER_OVERVIEW_PLAYER_ACCENT }
	}

	try {
		const image = await new Promise<HTMLImageElement>((resolve, reject) => {
			const element = new Image()
			element.crossOrigin = 'anonymous'
			element.decoding = 'async'
			element.onload = () => resolve(element)
			element.onerror = () => reject(new Error('Failed to load minecraft skin'))
			element.src = skinUrl
		})

		return extractAccentColorFromSkinImage(image)
	} catch {
		return { ...DEFAULT_SERVER_OVERVIEW_PLAYER_ACCENT }
	}
}
