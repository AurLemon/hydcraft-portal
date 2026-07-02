<template>
	<a
		:href="link.url"
		target="_blank"
		class="group relative flex h-full flex-col items-center justify-start gap-4 rounded-xl border border-slate-200 bg-white px-4 text-center text-slate-500 transition-colors duration-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-900"
		rel="noopener noreferrer"
	>
		<div v-if="link.archived" class="absolute right-3 top-3 z-10">
			<UTooltip :text="t('content.links.archived.tooltip')">
				<UBadge color="error" variant="solid" size="sm">
					{{ t('content.links.archived.label') }}
				</UBadge>
			</UTooltip>
		</div>
		<div class="flex items-center gap-3 pt-6 pb-0">
			<UAvatar
				:src="link.avatarUrl || undefined"
				:alt="link.name"
				size="2xl"
				class="h-12 w-12 shrink-0 rounded-lg"
				:class="link.archived ? 'grayscale saturate-0' : ''"
				:ui="avatarUi"
			/>
			<div class="min-w-0">
				<p
					class="truncate leading-[normal] text-xl"
					:class="
						link.archived
							? 'text-slate-500 dark:text-slate-400'
							: 'text-slate-950 dark:text-white'
					"
				>
					{{ link.name }}
				</p>
			</div>
		</div>
		<div v-if="link.summary" class="pb-6">
			<p
				class="line-clamp-2 text-xs text-center break-all"
				:class="
					link.archived
						? 'text-slate-400 dark:text-slate-500'
						: 'text-slate-500 dark:text-slate-400'
				"
			>
				{{ link.summary }}
			</p>
		</div>
	</a>
</template>

<script setup lang="ts">
import type { FriendLinkSummary } from '~/utils/links/friend-links'

interface FriendLinkCardProps {
	link: FriendLinkSummary
}

defineProps<FriendLinkCardProps>()

const { t } = useI18n()
const avatarUi = {
	root: 'rounded-lg overflow-hidden',
	fallback: 'rounded-lg',
}
</script>
