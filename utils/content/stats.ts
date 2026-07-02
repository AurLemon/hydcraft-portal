export interface ContentStats {
	cjkCharCount: number
	englishWordCount: number
	totalCount: number
	readingMinutes: number
}

const extractText = (node: unknown): string => {
	if (typeof node === 'string') {
		return node
	}

	if (Array.isArray(node)) {
		if (
			node.length >= 2 &&
			typeof node[0] === 'string' &&
			node[1] !== null &&
			typeof node[1] === 'object' &&
			!Array.isArray(node[1])
		) {
			return node.slice(2).map(extractText).join(' ')
		}

		return node.map(extractText).join(' ')
	}

	if (node !== null && typeof node === 'object') {
		const record = node as Record<string, unknown>

		if (Array.isArray(record.value)) {
			return record.value.map(extractText).join(' ')
		}

		if (Array.isArray(record.children)) {
			return record.children.map(extractText).join(' ')
		}

		if (typeof record.text === 'string') {
			return record.text
		}
	}

	return ''
}

const normalizeText = (text: string): string => text.replace(/\s+/g, ' ').trim()

export const getContentStats = (body: unknown): ContentStats => {
	const contentText = normalizeText(extractText(body))
	const cjkCharCount = (
		contentText.match(
			/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/g,
		) || []
	).length
	const englishWordCount = (
		contentText.match(/\b(?:[A-Za-z]+(?:'[A-Za-z]+)?|\d+)\b/g) || []
	).length
	const totalCount = cjkCharCount + englishWordCount
	const readingMinutes = Math.max(
		1,
		Math.ceil(cjkCharCount / 250 + englishWordCount / 180),
	)

	return {
		cjkCharCount,
		englishWordCount,
		totalCount,
		readingMinutes,
	}
}
