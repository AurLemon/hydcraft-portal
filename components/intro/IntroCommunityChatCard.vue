<template>
	<article
		class="relative min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-950 sm:px-5 sm:py-5"
	>
		<div class="pointer-events-none absolute inset-0">
			<div
				class="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(59,130,246,0.12)_0%,rgba(14,165,233,0.06)_45%,rgba(255,255,255,0)_100%)] dark:bg-[linear-gradient(180deg,rgba(59,130,246,0.14)_0%,rgba(14,165,233,0.08)_45%,rgba(2,6,23,0)_100%)]"
			/>
			<div
				class="absolute -left-8 top-4 size-24 rounded-full bg-sky-300/15 blur-2xl dark:bg-sky-400/10"
			/>
			<div
				class="absolute right-0 top-0 size-28 rounded-full bg-cyan-300/12 blur-3xl dark:bg-cyan-400/8"
			/>
		</div>

		<div class="relative z-10 flex flex-col gap-3">
			<h3
				v-if="card.title"
				class="font-arkpixel text-base leading-tight tracking-wide text-slate-900 dark:text-slate-50"
			>
				{{ card.title }}
			</h3>

			<div class="flex flex-col gap-3">
				<div
					v-for="(message, index) in card.messages"
					:key="`${message.memberId}-${index}`"
					class="flex items-start gap-3"
				>
					<SkeletonImage
						:src="getMinecraftAvatarRendererUrl(message.memberId)"
						:alt="message.displayName"
						class="size-12 shrink-0"
						image-class="size-12 rounded-lg border border-slate-200 bg-slate-100 object-cover shadow-sm dark:border-slate-700 dark:bg-slate-800"
						skeleton-class="rounded-lg"
					/>

					<div
						class="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50/96 px-4 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_10px_30px_rgba(15,23,42,0.18)]"
					>
						<div
							class="text-lg leading-none tracking-wide"
							:class="getRoleToneClass(message.roleTone)"
						>
							{{ message.displayName }}
						</div>
						<p
							class="mt-2 whitespace-pre-line break-words text-sm leading-7 text-slate-700 dark:text-slate-100/92"
						>
							{{ message.text }}
						</p>
					</div>
				</div>
			</div>
		</div>
	</article>
</template>

<script setup lang="ts">
import type {
	IntroCommunityChatCardData,
	IntroCommunityChatRoleTone,
} from '~/components/intro/community-chat'
import { getMinecraftAvatarRendererUrl } from '~/utils/minecraft/body-renderer'

interface IntroCommunityChatCardProps {
	card: IntroCommunityChatCardData
}

defineProps<IntroCommunityChatCardProps>()

const getRoleToneClass = (tone?: IntroCommunityChatRoleTone): string => {
	switch (tone) {
		case 'help':
			return 'font-arkpixel text-amber-300'
		case 'warning':
			return 'font-arkpixel text-emerald-300'
		case 'admin':
			return 'font-arkpixel text-rose-300'
		case 'info':
		default:
			return 'font-arkpixel text-sky-300'
	}
}
</script>
