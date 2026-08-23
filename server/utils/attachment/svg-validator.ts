import { XMLParser, XMLValidator } from 'fast-xml-parser'
import { createBadRequestError } from '../errors'

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
const FORBIDDEN_ELEMENTS = new Set([
	'animate',
	'animatemotion',
	'animatetransform',
	'audio',
	'embed',
	'foreignobject',
	'iframe',
	'image',
	'object',
	'script',
	'set',
	'style',
	'video',
])
const ALLOWED_ELEMENTS = new Set([
	'circle',
	'clippath',
	'defs',
	'desc',
	'ellipse',
	'g',
	'lineargradient',
	'line',
	'marker',
	'mask',
	'metadata',
	'path',
	'pattern',
	'polygon',
	'polyline',
	'radialgradient',
	'rect',
	'stop',
	'svg',
	'switch',
	'symbol',
	'text',
	'textpath',
	'title',
	'tspan',
	'use',
])
const DANGEROUS_DOCUMENT_MARKUP = /<!doctype|<!entity|<\?(?!xml\s)/i
const DANGEROUS_PROTOCOL = /(?:javascript|data|vbscript)\s*:/i
const URL_REFERENCE = /url\(\s*(['"]?)(.*?)\1\s*\)/gi

const invalidSvg = (): never => {
	throw createBadRequestError('INVALID_SVG_CONTENT')
}

const getLocalName = (name: string): string =>
	name.split(':').at(-1)?.toLowerCase() ?? ''

const assertSafeUrlReferences = (value: string): void => {
	if (DANGEROUS_PROTOCOL.test(value)) {
		invalidSvg()
	}

	for (const match of value.matchAll(URL_REFERENCE)) {
		if (!match[2]?.trim().startsWith('#')) {
			invalidSvg()
		}
	}
}

const assertSafeAttribute = (name: string, value: unknown): void => {
	const localName = getLocalName(name)

	if (localName.startsWith('on') || localName === 'style') {
		invalidSvg()
	}

	if (typeof value !== 'string') {
		return
	}

	if (localName === 'href' || localName === 'src') {
		if (!value.trim().startsWith('#')) {
			invalidSvg()
		}
	}

	assertSafeUrlReferences(value)
}

const assertSafeNode = (node: unknown): void => {
	if (Array.isArray(node)) {
		for (const item of node) {
			assertSafeNode(item)
		}
		return
	}

	if (!node || typeof node !== 'object') {
		return
	}

	for (const [name, value] of Object.entries(node)) {
		if (name.startsWith('@_')) {
			assertSafeAttribute(name.slice(2), value)
			continue
		}

		const localName = getLocalName(name)
		if (FORBIDDEN_ELEMENTS.has(localName) || !ALLOWED_ELEMENTS.has(localName)) {
			invalidSvg()
		}

		assertSafeNode(value)
	}
}

const decodeSvgSource = (buffer: Buffer): string => {
	try {
		return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
	} catch {
		return invalidSvg()
	}
}

const parseSvgSource = (source: string): Record<string, unknown> => {
	try {
		return new XMLParser({
			ignoreAttributes: false,
			processEntities: false,
		}).parse(source) as Record<string, unknown>
	} catch {
		return invalidSvg()
	}
}

export const validateSvgAttachment = (buffer: Buffer): void => {
	const source = decodeSvgSource(buffer)
	if (!source.trim() || DANGEROUS_DOCUMENT_MARKUP.test(source)) {
		invalidSvg()
	}

	if (XMLValidator.validate(source) !== true) {
		invalidSvg()
	}

	const parsed = parseSvgSource(source)
	const rootNames = Object.keys(parsed)
	if (
		rootNames.length !== 1 ||
		rootNames[0] !== 'svg' ||
		parsed.svg === undefined
	) {
		invalidSvg()
	}

	const namespace =
		parsed.svg && typeof parsed.svg === 'object'
			? (parsed.svg as Record<string, unknown>)['@_xmlns']
			: undefined
	if (namespace !== undefined && namespace !== SVG_NAMESPACE) {
		invalidSvg()
	}

	assertSafeNode(parsed)
}
