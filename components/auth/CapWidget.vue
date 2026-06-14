<template>
	<div class="overflow-hidden">
		<ClientOnly>
			<USkeleton v-if="loading" class="h-14 w-full rounded-2xl" />
			<div
				v-else-if="loadFailed"
				class="flex min-h-20 items-center justify-center rounded-2xl border border-red-200/70 bg-red-50 px-4 text-sm text-red-600 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300"
			>
				{{ t('auth.captcha.status.unavailable') }}
			</div>
			<cap-widget
				v-else
				:key="widgetKey"
				ref="widgetElement"
				class="cap-widget-shell"
				:style="capWidgetStyle"
				data-cap-fullwidth="true"
				:data-cap-api-endpoint="apiEndpoint"
				v-bind="capI18nAttrs"
			/>
			<template #fallback>
				<USkeleton class="h-20 w-full rounded-2xl" />
			</template>
		</ClientOnly>
	</div>
</template>

<script setup lang="ts">
import { applyCapWidgetPatch } from '~/utils/cap/widget-patch'

interface CapWidgetProps {
	modelValue?: string
}

interface CapSolveDetail {
	token?: string
}

interface CapWidgetExposed {
	reset: () => void
}

interface CapWidgetStyle {
	'--cap-font': string
	'--cap-widget-width': string
}

declare global {
	interface Window {
		CAP_CUSTOM_WASM_URL?: string
	}
}

let capScriptPromise: Promise<void> | null = null

const props = withDefaults(defineProps<CapWidgetProps>(), {
	modelValue: '',
})

const emit = defineEmits<{
	'update:modelValue': [value: string]
}>()

interface CapI18nMessages {
	initialState: string
	verifyingLabel: string
	solvedLabel: string
	errorLabel: string
	verifyAriaLabel: string
	verifyingAriaLabel: string
	verifiedAriaLabel: string
	errorAriaLabel: string
}

type CapLocale = 'zh-CN' | 'zh-TW' | 'ja-JP' | 'en-US'

const CAP_I18N_FALLBACKS: Record<CapLocale, CapI18nMessages> = {
	'zh-CN': {
		initialState: '点击进行验证',
		verifyingLabel: '验证中...',
		solvedLabel: '验证通过',
		errorLabel: '验证失败，请重试。',
		verifyAriaLabel: '点击开始验证',
		verifyingAriaLabel: '正在计算验证，请稍候',
		verifiedAriaLabel: '验证已完成，可以继续操作',
		errorAriaLabel: '验证过程中发生错误，请重试',
	},
	'zh-TW': {
		initialState: '點擊進行驗證',
		verifyingLabel: '驗證中...',
		solvedLabel: '驗證通過',
		errorLabel: '驗證失敗，請重試。',
		verifyAriaLabel: '點擊開始驗證',
		verifyingAriaLabel: '正在計算驗證，請稍候',
		verifiedAriaLabel: '驗證已完成，可以繼續操作',
		errorAriaLabel: '驗證過程中發生錯誤，請重試',
	},
	'ja-JP': {
		initialState: 'クリックして認証',
		verifyingLabel: '認証中...',
		solvedLabel: '認証済み',
		errorLabel: '認証に失敗しました。もう一度お試しください。',
		verifyAriaLabel: 'クリックして認証を開始',
		verifyingAriaLabel: '認証を計算中です。しばらくお待ちください',
		verifiedAriaLabel: '認証が完了しました。続行できます',
		errorAriaLabel: '認証中にエラーが発生しました。再試行してください',
	},
	'en-US': {
		initialState: 'Click to verify',
		verifyingLabel: 'Verifying...',
		solvedLabel: 'Verified',
		errorLabel: 'Verification failed. Try again.',
		verifyAriaLabel: 'Click to start verification',
		verifyingAriaLabel: 'Computing verification, please wait',
		verifiedAriaLabel: 'Verification completed, you may continue',
		errorAriaLabel: 'An error occurred during verification, please try again',
	},
}

const isCapLocale = (value: string): value is CapLocale =>
	value === 'zh-CN' ||
	value === 'zh-TW' ||
	value === 'ja-JP' ||
	value === 'en-US'

const { locale, t, te } = useI18n()
const runtimeConfig = useRuntimeConfig()
const widgetElement = ref<HTMLElement | null>(null)
const loading = ref(true)
const loadFailed = ref(false)
const solved = ref(false)
const widgetKey = ref(0)

const baseUrl = computed(() =>
	(runtimeConfig.public.capBaseUrl ?? '').trim().replace(/\/+$/, ''),
)
const apiEndpoint = computed(() =>
	baseUrl.value ? `${baseUrl.value}/api/` : '',
)

const resolvedLocale = computed<CapLocale>(() => {
	const normalizedLocale = locale.value.trim()

	if (isCapLocale(normalizedLocale)) {
		return normalizedLocale
	}

	if (normalizedLocale.startsWith('zh-TW')) {
		return 'zh-TW'
	}

	if (normalizedLocale.startsWith('zh')) {
		return 'zh-CN'
	}

	if (normalizedLocale.startsWith('ja')) {
		return 'ja-JP'
	}

	return 'en-US'
})

const resolveCapText = (
	key: string,
	fallbackKey: keyof CapI18nMessages,
): string => {
	if (te(key)) {
		return t(key)
	}

	return CAP_I18N_FALLBACKS[resolvedLocale.value][fallbackKey]
}

const capI18nAttrs = computed<Record<string, string>>(() => ({
	'data-cap-i18n-initial-state': resolveCapText(
		'auth.captcha.widget.initialState',
		'initialState',
	),
	'data-cap-i18n-verifying-label': resolveCapText(
		'auth.captcha.widget.verifyingLabel',
		'verifyingLabel',
	),
	'data-cap-i18n-solved-label': resolveCapText(
		'auth.captcha.widget.solvedLabel',
		'solvedLabel',
	),
	'data-cap-i18n-error-label': resolveCapText(
		'auth.captcha.widget.errorLabel',
		'errorLabel',
	),
	'data-cap-i18n-verify-aria-label': resolveCapText(
		'auth.captcha.widget.verifyAriaLabel',
		'verifyAriaLabel',
	),
	'data-cap-i18n-verifying-aria-label': resolveCapText(
		'auth.captcha.widget.verifyingAriaLabel',
		'verifyingAriaLabel',
	),
	'data-cap-i18n-verified-aria-label': resolveCapText(
		'auth.captcha.widget.verifiedAriaLabel',
		'verifiedAriaLabel',
	),
	'data-cap-i18n-error-aria-label': resolveCapText(
		'auth.captcha.widget.errorAriaLabel',
		'errorAriaLabel',
	),
}))
const capWidgetStyle = computed<CapWidgetStyle>(() => ({
	'--cap-font':
		'var(--font-sans, Rubik, "MiSans VF", "MiSans Latin VF", "Misans TC VF", sans-serif)',
	'--cap-widget-width': '100%',
}))
const capWidgetPatchOptions = computed(() => ({
	fontFamily: capWidgetStyle.value['--cap-font'],
	fullWidth: true,
	disableHoverLift: true,
}))

const loadScript = async (src: string, key: string): Promise<void> => {
	const existingScript = document.querySelector<HTMLScriptElement>(
		`script[data-cap-script="${key}"]`,
	)

	if (existingScript?.dataset.loaded === 'true') {
		return
	}

	await new Promise<void>((resolve, reject) => {
		const script = existingScript ?? document.createElement('script')
		script.src = src
		script.async = true
		script.dataset.capScript = key

		script.addEventListener('load', () => {
			script.dataset.loaded = 'true'
			resolve()
		})
		script.addEventListener('error', () => {
			reject(new Error(`CAP_SCRIPT_LOAD_FAILED:${key}`))
		})

		if (!existingScript) {
			document.head.appendChild(script)
		}
	})
}

const loadCapScript = async (): Promise<void> => {
	if (!import.meta.client) {
		return
	}

	if (!baseUrl.value) {
		loadFailed.value = true
		loading.value = false
		return
	}

	if (!capScriptPromise) {
		capScriptPromise = (async () => {
			window.CAP_CUSTOM_WASM_URL = `${baseUrl.value}/cap-assets/cap_wasm.min.js`
			await loadScript(`${baseUrl.value}/cap.min.js`, `${baseUrl.value}:core`)
		})()
	}

	try {
		await capScriptPromise
		loadFailed.value = false
	} catch {
		loadFailed.value = true
	} finally {
		loading.value = false
	}
}

const handleSolve = (event: Event): void => {
	const detail = (event as CustomEvent<CapSolveDetail>).detail
	const token = detail.token?.trim()

	if (!token) {
		solved.value = false
		emit('update:modelValue', '')
		return
	}

	solved.value = true
	emit('update:modelValue', token)
}

const handleError = (): void => {
	solved.value = false
	emit('update:modelValue', '')
}

const bindWidgetEvents = (): void => {
	const element = widgetElement.value

	if (!element) {
		return
	}

	applyCapWidgetPatch(element, capWidgetPatchOptions.value)
	element.addEventListener('solve', handleSolve as EventListener)
	element.addEventListener('error', handleError as EventListener)
}

const unbindWidgetEvents = (): void => {
	const element = widgetElement.value

	if (!element) {
		return
	}

	element.removeEventListener('solve', handleSolve as EventListener)
	element.removeEventListener('error', handleError as EventListener)
}

const reset = (): void => {
	unbindWidgetEvents()
	solved.value = false
	emit('update:modelValue', '')
	widgetKey.value += 1
	nextTick(() => {
		bindWidgetEvents()
	})
}

watch(widgetElement, (element, previousElement) => {
	if (previousElement) {
		previousElement.removeEventListener('solve', handleSolve as EventListener)
		previousElement.removeEventListener('error', handleError as EventListener)
	}

	if (element) {
		bindWidgetEvents()
	}
})

watch(
	() => props.modelValue,
	(value) => {
		solved.value = Boolean(value)
	},
)

onMounted(async () => {
	await loadCapScript()
	bindWidgetEvents()
})

onBeforeUnmount(() => {
	unbindWidgetEvents()
})

defineExpose<CapWidgetExposed>({
	reset,
})
</script>

<style scoped>
.cap-widget-shell {
	display: block;
	width: 100%;
}

.cap-widget-shell::part(container) {
	width: 100%;
	font-family: var(--font-sans);
	transform: none;
}

.cap-widget-shell::part(container):hover,
.cap-widget-shell::part(container):active {
	transform: none;
}
</style>
