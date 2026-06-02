<template>
	<article
		ref="articleRef"
		class="site-shell mx-auto w-full min-w-0 pb-12 text-lg leading-8 text-slate-800 dark:text-slate-100"
	>
		<Transition name="markdown-locale" mode="out-in" appear>
			<div v-if="doc" :key="displayKey" class="min-w-0">
				<slot name="header" :doc="doc" />
				<div class="mx-auto w-full max-w-3xl min-w-0">
					<ContentRenderer :value="doc" />
				</div>
				<slot name="footer" :doc="doc" />
			</div>
		</Transition>
	</article>
</template>

<script setup lang="ts">
import { notifyScrollRestoreReady } from '~/utils/scroll'

type LocaleCode = 'zh-CN' | 'zh-TW' | 'ja-JP' | 'en-US'
interface MarkdownPageDoc {
	body?: unknown
	meta?: {
		updatedAt?: string
	}
	updatedAt?: string
}

const route = useRoute()
const { $i18n } = useNuxtApp()
const locale = ($i18n as { locale: Ref<LocaleCode> }).locale
const articleRef = ref<HTMLElement | null>(null)
const displayDoc = shallowRef<MarkdownPageDoc | null>(null)
const displayKey = ref('')

let readyObserver: ResizeObserver | null = null
let readyTimer: ReturnType<typeof setTimeout> | null = null
let readyFallbackTimer: ReturnType<typeof setTimeout> | null = null
let readySequence = 0
let requestSequence = 0

const normalizedPage = computed(() => {
	const path = route.path
		.replace(/^\/(?:zh-CN|zh-TW|ja-JP|en-US)(?=\/|$)/, '')
		.replace(/^\/+|\/+$/g, '')

	return path || 'index'
})

const localePath = computed(() =>
	String(locale.value as LocaleCode).toLowerCase(),
)

const loadDoc = async (): Promise<MarkdownPageDoc | null> => {
	const localizedDoc = await queryCollection('content')
		.path(`/${localePath.value}/${normalizedPage.value}`)
		.first()

	if (localizedDoc) {
		return localizedDoc
	}

	if (localePath.value !== 'zh-cn') {
		return await queryCollection('content')
			.path(`/zh-cn/${normalizedPage.value}`)
			.first()
	}

	return null
}

const commitDisplayDoc = (nextDoc: MarkdownPageDoc | null): void => {
	displayDoc.value = nextDoc
	displayKey.value = `${route.fullPath}::${requestSequence}`
}

commitDisplayDoc(await loadDoc())

watch(
	() => [localePath.value, normalizedPage.value],
	async () => {
		const sequence = ++requestSequence
		const nextDoc = await loadDoc()

		if (sequence !== requestSequence) {
			return
		}

		commitDisplayDoc(nextDoc)
	},
	{ immediate: false },
)

const doc = computed(() => displayDoc.value)

const clearReadyWaiters = (): void => {
	if (readyObserver) {
		readyObserver.disconnect()
		readyObserver = null
	}

	if (readyTimer !== null) {
		clearTimeout(readyTimer)
		readyTimer = null
	}

	if (readyFallbackTimer !== null) {
		clearTimeout(readyFallbackTimer)
		readyFallbackTimer = null
	}
}

const scheduleRestoreReadyNotification = async (): Promise<void> => {
	if (!import.meta.client || !doc.value) {
		clearReadyWaiters()
		return
	}

	readySequence += 1
	const sequence = readySequence

	await nextTick()

	if (sequence !== readySequence) {
		return
	}

	clearReadyWaiters()

	const emitReady = (): void => {
		if (sequence !== readySequence) {
			return
		}

		notifyScrollRestoreReady(route.fullPath)
	}

	const resetStableTimer = (): void => {
		if (readyTimer !== null) {
			clearTimeout(readyTimer)
		}

		readyTimer = setTimeout(() => {
			readyTimer = null
			emitReady()
		}, 120)
	}

	resetStableTimer()

	const article = articleRef.value
	if (!article) {
		return
	}

	readyObserver = new ResizeObserver(() => {
		resetStableTimer()
	})
	readyObserver.observe(article)

	readyFallbackTimer = setTimeout(() => {
		emitReady()
	}, 2000)
}

watch(
	() => [doc.value, displayKey.value],
	() => {
		void scheduleRestoreReadyNotification()
	},
	{ immediate: true },
)

onBeforeUnmount(() => {
	clearReadyWaiters()
})
</script>
