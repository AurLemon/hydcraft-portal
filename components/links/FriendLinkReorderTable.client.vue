<template>
	<div class="min-w-0">
		<h2 class="mb-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
			{{ t(`content.links.categories.${category}`) }}
		</h2>
		<div class="min-w-0 max-w-full overflow-x-auto">
			<table class="min-w-[40rem] border-collapse">
				<thead>
					<tr
						class="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-800"
					>
						<th class="w-8 p-2" />
						<th class="p-2">{{ t('admin.links.fields.link') }}</th>
						<th class="p-2">{{ t('admin.links.fields.enabled') }}</th>
						<th class="w-10 p-2" />
					</tr>
				</thead>
				<draggable
					:list="localList"
					:item-key="'id'"
					tag="tbody"
					handle=".friend-link-grip"
					:animation="160"
					@end="onEnd"
				>
					<template #item="{ element }">
						<tr
							class="border-b border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/40"
						>
							<td class="p-2">
								<UIcon
									name="i-lucide-grip-vertical"
									class="friend-link-grip size-4 cursor-grab text-slate-400 active:cursor-grabbing"
								/>
							</td>
							<td class="p-2">
								<button
									type="button"
									class="flex min-w-0 items-center gap-3 text-left"
									@click="emit('edit', element)"
								>
									<UAvatar
										:src="element.avatarUrl || undefined"
										:alt="element.name"
										class="rounded-lg"
										:ui="avatarUi"
									/>
									<div class="min-w-0">
										<p
											class="truncate font-medium text-slate-900 dark:text-white"
										>
											{{ element.name }}
										</p>
										<p class="truncate text-xs text-slate-500">
											{{ element.url }}
										</p>
									</div>
								</button>
							</td>
							<td class="p-2">
								<UBadge
									:color="element.enabled ? 'success' : 'neutral'"
									variant="subtle"
								>
									{{
										element.enabled
											? t('admin.links.states.enabled')
											: t('admin.links.states.disabled')
									}}
								</UBadge>
							</td>
							<td class="p-2">
								<UButton
									type="button"
									size="xs"
									color="neutral"
									variant="ghost"
									icon="i-lucide-pencil"
									@click="emit('edit', element)"
								/>
							</td>
						</tr>
					</template>
				</draggable>
			</table>
		</div>
	</div>
</template>

<script setup lang="ts">
import draggable from 'vuedraggable'
import type {
	FriendLinkCategory,
	FriendLinkSummary,
} from '~/utils/links/friend-links'

const props = defineProps<{
	category: FriendLinkCategory
	items: FriendLinkSummary[]
}>()
const emit = defineEmits<{
	reorder: [orderedIds: string[]]
	edit: [link: FriendLinkSummary]
}>()

const { t } = useI18n()
const avatarUi = {
	root: 'rounded-lg overflow-hidden',
	fallback: 'rounded-lg',
}

const localList = ref<FriendLinkSummary[]>([...props.items])

watch(
	() => props.items,
	(items) => {
		localList.value = [...items]
	},
)

const onEnd = (): void => {
	emit(
		'reorder',
		localList.value.map((item) => item.id),
	)
}
</script>
