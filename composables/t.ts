import type { Composer } from 'vue-i18n'

type TranslateValues = Record<string, unknown>
type TranslateOptions = Record<string, unknown>

export const t = (
	key: string,
	values?: TranslateValues,
	options?: TranslateOptions,
): string => {
	const { $i18n } = useNuxtApp()
	const translate = ($i18n as Composer).t as (
		key: string,
		values?: TranslateValues,
		options?: TranslateOptions,
	) => string

	return translate(key, values, options)
}
