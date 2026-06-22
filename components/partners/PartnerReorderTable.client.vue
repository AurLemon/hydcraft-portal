<template>
	<div>
		<h2 class="mb-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
			{{ t(`admin.partners.partnerSections.${section}`) }}
		</h2>
		<table class="w-full border-collapse">
			<thead>
				<tr
					class="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-800"
				>
					<th class="w-8 p-2" />
					<th class="p-2">{{ t('admin.partners.fields.partner') }}</th>
					<th v-if="section === 'COMMUNITY'" class="p-2">
						{{ t('admin.partners.fields.kind') }}
					</th>
					<th class="p-2">{{ t('admin.partners.fields.enabled') }}</th>
					<th class="w-10 p-2" />
				</tr>
			</thead>
			<draggable
				:list="localList"
				:item-key="'id'"
				tag="tbody"
				handle=".partner-grip"
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
								class="partner-grip size-4 cursor-grab text-slate-400 active:cursor-grabbing"
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
								<span
									class="min-w-0 truncate font-medium text-slate-900 dark:text-white"
								>
									{{ element.name }}
								</span>
							</button>
						</td>
						<td v-if="section === 'COMMUNITY'" class="p-2">
							<UBadge v-if="element.kind" color="neutral" variant="subtle">
								{{ t(`admin.partners.kinds.${element.kind}`) }}
							</UBadge>
							<span v-else class="text-slate-400">—</span>
						</td>
						<td class="p-2">
							<UBadge
								:color="element.enabled ? 'success' : 'neutral'"
								variant="subtle"
							>
								{{
									element.enabled
										? t('admin.partners.states.enabled')
										: t('admin.partners.states.disabled')
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
</template>

<script setup lang="ts">
import draggable from 'vuedraggable'
import type { PartnerSection, PartnerSummary } from '~/utils/partners'

const props = defineProps<{
	section: PartnerSection
	items: PartnerSummary[]
}>()
const emit = defineEmits<{
	reorder: [orderedIds: string[]]
	edit: [partner: PartnerSummary]
}>()

const { t } = useI18n()
const avatarUi = {
	root: 'rounded-lg overflow-hidden',
	fallback: 'rounded-lg',
}

const localList = ref<PartnerSummary[]>([...props.items])

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
