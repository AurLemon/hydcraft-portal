<template>
	<div
		class="mx-auto mt-8 w-full max-w-3xl rounded-lg border border-slate-200 bg-white p-5 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
	>
		<div class="flex min-w-0 items-start gap-3.5">
			<div
				class="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"
			>
				<UIcon name="i-lucide-check" class="size-5" />
			</div>
			<div class="min-w-0 flex-1">
				<p class="text-2xl font-medium text-slate-900 dark:text-slate-50">
					{{
						t('content.documentApproval.approvedByCommittee', {
							date: formattedApprovedDate,
						})
					}}
				</p>

				<div class="mt-2 flex items-center gap-3.5">
					<div class="flex flex-wrap items-center gap-1.5 text-sm">
						<div class="flex items-center gap-1.5">
							<span
								class="text-base font-semibold tabular-nums text-emerald-600 dark:text-emerald-400"
							>
								{{ approveCount }}
							</span>
							<div class="flex flex-wrap items-center gap-1">
								<span
									v-for="index in approveDots"
									:key="`approve-dot-${index}`"
									class="size-2 rounded-full bg-emerald-500"
									aria-hidden="true"
								/>
							</div>
						</div>

						<div v-if="vetoDots.length" class="flex items-center gap-1.5">
							<div class="flex flex-wrap items-center gap-1">
								<span
									v-for="index in vetoDots"
									:key="`veto-dot-${index}`"
									class="size-2 rounded-full bg-slate-400"
									aria-hidden="true"
								/>
							</div>
						</div>

						<div class="flex items-center gap-1.5">
							<span
								class="text-base font-semibold tabular-nums text-rose-600 dark:text-rose-400"
							>
								{{ vetoCount }}
							</span>
						</div>

						<div v-if="abstainDots.length" class="flex items-center gap-1.5">
							<div class="flex flex-wrap items-center gap-1">
								<span
									v-for="index in abstainDots"
									:key="`abstain-dot-${index}`"
									class="size-2 rounded-full bg-rose-500"
									aria-hidden="true"
								/>
							</div>
							<span
								class="text-base font-semibold tabular-nums text-rose-600 dark:text-rose-400"
							>
								{{ abstainCount }}
							</span>
						</div>
					</div>

					<div class="flex flex-wrap items-center gap-2">
						<UBadge color="success" variant="soft" size="sm">
							{{ t('content.documentApproval.statusInEffect') }}
						</UBadge>
						<UBadge color="neutral" variant="soft" size="sm">
							{{ editionLabel }}
						</UBadge>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const props = defineProps<{
	approvedAt: string
	approveCount: number
	abstainCount: number
	edition: number
	vetoCount?: number
}>()

const { locale, t } = useI18n()

const approvedDate = computed(() => new Date(props.approvedAt))

const formatApprovedDate = (date: Date): string => {
	if (locale.value.startsWith('zh') || locale.value.startsWith('ja')) {
		return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`
	}

	return new Intl.DateTimeFormat(locale.value, {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		timeZone: 'Asia/Shanghai',
	}).format(date)
}

const zhOrdinalMap = [
	'零',
	'一',
	'二',
	'三',
	'四',
	'五',
	'六',
	'七',
	'八',
	'九',
]
const enOrdinalMap = [
	'Zeroth',
	'First',
	'Second',
	'Third',
	'Fourth',
	'Fifth',
	'Sixth',
	'Seventh',
	'Eighth',
	'Ninth',
]

const formatZhOrdinal = (value: number): string => {
	if (value <= 10) {
		if (value === 10) {
			return '十'
		}

		return zhOrdinalMap[value] ?? String(value)
	}

	if (value < 20) {
		return `十${zhOrdinalMap[value % 10] ?? ''}`
	}

	const tens = Math.floor(value / 10)
	const ones = value % 10
	return `${zhOrdinalMap[tens] ?? tens}十${ones ? (zhOrdinalMap[ones] ?? ones) : ''}`
}

const formatEnOrdinal = (value: number): string => {
	if (value < enOrdinalMap.length) {
		return enOrdinalMap[value] ?? String(value)
	}

	const mod10 = value % 10
	const mod100 = value % 100

	if (mod10 === 1 && mod100 !== 11) {
		return `${value}st`
	}

	if (mod10 === 2 && mod100 !== 12) {
		return `${value}nd`
	}

	if (mod10 === 3 && mod100 !== 13) {
		return `${value}rd`
	}

	return `${value}th`
}

const editionOrdinal = computed(() => {
	if (locale.value.startsWith('zh') || locale.value.startsWith('ja')) {
		return formatZhOrdinal(props.edition)
	}

	return formatEnOrdinal(props.edition)
})

const editionLabel = computed(() =>
	t('content.documentApproval.edition', {
		ordinal: editionOrdinal.value,
	}),
)

const approveDots = computed(() =>
	Array.from(
		{ length: Math.max(props.approveCount, 0) },
		(_, index) => index + 1,
	),
)

const vetoDots = computed(() =>
	Array.from(
		{ length: Math.max(props.vetoCount ?? 0, 0) },
		(_, index) => index + 1,
	),
)

const vetoCount = computed(() => Math.max(props.vetoCount ?? 0, 0))

const abstainDots = computed(() =>
	Array.from(
		{ length: Math.max(props.abstainCount, 0) },
		(_, index) => index + 1,
	),
)

const formattedApprovedDate = computed(() => {
	if (Number.isNaN(approvedDate.value.getTime())) {
		return props.approvedAt
	}

	return formatApprovedDate(approvedDate.value)
})
</script>
