<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const isAtBottom = ref(false)
const rawAtBottom = ref(false)
const hasContent = ref(false)
const statusbarRef = ref<HTMLElement | null>(null)

const BOTTOM_HIDE_DELAY = 180
const BOTTOM_SHOW_DELAY = 120

let bottomHideTimer: ReturnType<typeof setTimeout> | null = null
let bottomShowTimer: ReturnType<typeof setTimeout> | null = null
let scrollRaf = 0
let contentObserver: MutationObserver | null = null

const updateBottomState = (): void => {
	if (!import.meta.client) {
		return
	}

	const doc = document.documentElement
	const scrollTop = window.scrollY || doc.scrollTop || 0
	const viewportHeight = window.innerHeight
	const scrollHeight = Math.max(
		doc.scrollHeight,
		document.body?.scrollHeight ?? 0,
	)
	const threshold = 32
	const nextAtBottom = scrollTop + viewportHeight >= scrollHeight - threshold

	if (nextAtBottom === rawAtBottom.value) {
		return
	}

	rawAtBottom.value = nextAtBottom

	if (nextAtBottom) {
		if (bottomShowTimer) {
			clearTimeout(bottomShowTimer)
			bottomShowTimer = null
		}

		if (isAtBottom.value || bottomHideTimer) {
			return
		}

		bottomHideTimer = setTimeout(() => {
			bottomHideTimer = null
			if (rawAtBottom.value) {
				isAtBottom.value = true
			}
		}, BOTTOM_HIDE_DELAY)
		return
	}

	if (bottomHideTimer) {
		clearTimeout(bottomHideTimer)
		bottomHideTimer = null
	}

	if (!isAtBottom.value) {
		if (bottomShowTimer) {
			clearTimeout(bottomShowTimer)
			bottomShowTimer = null
		}
		return
	}

	if (bottomShowTimer) {
		return
	}

	bottomShowTimer = setTimeout(() => {
		bottomShowTimer = null
		if (!rawAtBottom.value) {
			isAtBottom.value = false
		}
	}, BOTTOM_SHOW_DELAY)
}

const onScroll = (): void => {
	if (scrollRaf) {
		return
	}

	scrollRaf = window.requestAnimationFrame(() => {
		scrollRaf = 0
		updateBottomState()
	})
}

const onResize = (): void => {
	onScroll()
}

const syncContentState = (): void => {
	hasContent.value = (statusbarRef.value?.childElementCount ?? 0) > 0
}

onMounted(() => {
	updateBottomState()
	syncContentState()

	if (statusbarRef.value) {
		contentObserver = new MutationObserver(syncContentState)
		contentObserver.observe(statusbarRef.value, { childList: true })
	}

	window.addEventListener('scroll', onScroll, { passive: true })
	window.addEventListener('resize', onResize, { passive: true })
})

onBeforeUnmount(() => {
	window.removeEventListener('scroll', onScroll)
	window.removeEventListener('resize', onResize)

	if (scrollRaf) {
		window.cancelAnimationFrame(scrollRaf)
		scrollRaf = 0
	}

	if (bottomHideTimer) {
		clearTimeout(bottomHideTimer)
		bottomHideTimer = null
	}

	if (bottomShowTimer) {
		clearTimeout(bottomShowTimer)
		bottomShowTimer = null
	}

	contentObserver?.disconnect()
	contentObserver = null
})
</script>

<template>
	<aside>
		<div
			class="pointer-events-none fixed right-0 bottom-0 left-0 z-10 h-32 bg-white transition-opacity duration-500 ease-out mask-[linear-gradient(to_top,black_-5%,transparent_100%)] dark:bg-slate-950"
			:class="isAtBottom || !hasContent ? 'opacity-0' : 'opacity-100'"
		/>

		<div
			class="statusbar-shell pointer-events-none fixed bottom-14 left-1/2 z-100 flex w-[calc(100vw-24px)] justify-center lg:w-auto"
			:class="
				isAtBottom || !hasContent
					? 'statusbar-shell--hidden'
					: 'statusbar-shell--visible'
			"
			:aria-hidden="isAtBottom || !hasContent ? 'true' : 'false'"
		>
			<div
				id="page-statusbar"
				ref="statusbarRef"
				class="pointer-events-auto inline-flex items-center justify-center"
				:class="isAtBottom || !hasContent ? 'pointer-events-none' : ''"
				:data-statusbar-at-bottom="isAtBottom ? 'true' : 'false'"
			/>
		</div>
	</aside>
</template>

<style scoped>
.statusbar-shell {
	transform: translateX(-50%) translateY(0) scale(1);
	opacity: 1;
	filter: blur(0);
	transition-property: opacity, transform, filter;
	transition-duration: 280ms, 560ms, 280ms;
	transition-timing-function:
		cubic-bezier(0.2, 0.8, 0.2, 1), cubic-bezier(0.16, 1, 0.3, 1),
		cubic-bezier(0.2, 0.8, 0.2, 1);
	will-change: transform, opacity, filter;
}

.statusbar-shell--visible {
	transform: translateX(-50%) translateY(0) scale(1);
	opacity: 1;
	filter: blur(0);
}

.statusbar-shell--hidden {
	transform: translateX(-50%) translateY(14px) scale(0.94);
	opacity: 0;
	filter: blur(1px);
}
</style>
