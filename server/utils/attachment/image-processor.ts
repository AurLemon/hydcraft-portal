import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { createBadRequestError } from '../errors'
import type {
	AttachmentPolicy,
	AttachmentResizeVariantPolicy,
	AttachmentSourceVariantPolicy,
} from './types'

interface ProcessedImageVariant {
	name: string
	buffer: Buffer
	width: number
	height: number
	contentType: string
	ext: string
}

interface ProcessImageAttachmentInput {
	originalBuffer: Buffer
	policy: AttachmentPolicy
}

interface ProcessImageAttachmentResult {
	width: number
	height: number
	sha256: string
	variants: ProcessedImageVariant[]
}

const CROP_ASPECT_RATIO_TOLERANCE = 0.03
const SUPPORTED_IMAGE_FORMATS = new Set(['jpeg', 'png', 'webp'])

const badRequest = (code: string) => createBadRequestError(code)

const validateCropAspectRatio = (
	cropRegion: {
		width: number
		height: number
	},
	expectedRatio: number | undefined,
): void => {
	if (!expectedRatio) {
		return
	}

	const actualRatio = cropRegion.width / cropRegion.height
	if (Math.abs(actualRatio - expectedRatio) > CROP_ASPECT_RATIO_TOLERANCE) {
		throw badRequest('INVALID_CROP')
	}
}

const buildSourceVariant = async (
	source: sharp.Sharp,
	variant: AttachmentSourceVariantPolicy,
): Promise<ProcessedImageVariant> => {
	const { data, info } = await source
		.clone()
		.webp({
			quality: 86,
			effort: 4,
		})
		.toBuffer({ resolveWithObject: true })

	return {
		name: variant.name,
		buffer: data,
		width: info.width,
		height: info.height,
		contentType: 'image/webp',
		ext: 'webp',
	}
}

const buildResizeVariant = async (
	source: sharp.Sharp,
	variant: AttachmentResizeVariantPolicy,
): Promise<ProcessedImageVariant> => {
	const pipeline = source
		.clone()
		.resize({
			width: variant.width,
			height: variant.height,
			fit: variant.fit,
			withoutEnlargement: variant.fit === 'inside',
		})
		.webp({
			quality: 86,
			effort: 4,
		})

	const { data, info } = await pipeline.toBuffer({ resolveWithObject: true })

	return {
		name: variant.name,
		buffer: data,
		width: info.width,
		height: info.height,
		contentType: 'image/webp',
		ext: 'webp',
	}
}

export const processImageAttachment = async (
	input: ProcessImageAttachmentInput,
): Promise<ProcessImageAttachmentResult> => {
	const originalBytes = new Uint8Array(
		input.originalBuffer.buffer,
		input.originalBuffer.byteOffset,
		input.originalBuffer.byteLength,
	)
	const sha256 = createHash('sha256').update(originalBytes).digest('hex')
	const baseImage = sharp(input.originalBuffer, {
		failOn: 'warning',
	}).rotate()
	const metadata = await baseImage.metadata()

	if (!metadata.format || !SUPPORTED_IMAGE_FORMATS.has(metadata.format)) {
		throw badRequest('INVALID_CONTENT_TYPE')
	}

	if (!metadata.width || !metadata.height) {
		throw badRequest('IMAGE_PROCESSING_FAILED')
	}

	const sourceWidth = metadata.width
	const sourceHeight = metadata.height
	if (input.policy.requiresCrop) {
		validateCropAspectRatio(
			{
				width: sourceWidth,
				height: sourceHeight,
			},
			input.policy.aspectRatio,
		)
	}
	const source = sharp(input.originalBuffer).rotate()
	const variants: ProcessedImageVariant[] = []

	for (const variant of input.policy.variants) {
		variants.push(
			variant.mode === 'source'
				? await buildSourceVariant(source, variant)
				: await buildResizeVariant(source, variant),
		)
	}

	return {
		width: sourceWidth,
		height: sourceHeight,
		sha256,
		variants,
	}
}
