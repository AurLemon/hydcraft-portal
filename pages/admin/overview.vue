<template>
	<div>
		<div
			class="flex flex-col gap-5 md:flex-row md:items-end md:justify-between"
		>
			<div>
				<h1 class="text-3xl font-semibold text-slate-950 dark:text-white">
					{{ t('admin.overview.title') }}
				</h1>
			</div>
		</div>

		<section class="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
			<div
				class="rounded-lg border border-slate-300/80 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
			>
				<p
					class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"
				>
					<UIcon name="i-lucide-server" class="h-4 w-4" />
					{{ t('admin.overview.metrics.servers') }}
				</p>
				<div class="mt-3 flex items-end gap-2">
					<USkeleton v-if="pending" class="h-9 w-24" />
					<p
						v-else
						class="text-3xl font-semibold text-slate-950 dark:text-white"
					>
						{{ overview?.serverCount ?? 0 }}
					</p>
				</div>
				<div class="mt-3 flex items-center gap-2 text-sm">
					<span
						class="h-2 w-2 shrink-0 rounded-full"
						:class="statusDotClass(overview?.serverStatus ?? 'inactive')"
					/>
					<span class="text-slate-600 dark:text-slate-300">
						{{ statusText(overview?.serverStatus ?? 'inactive') }}
					</span>
				</div>
			</div>

			<div
				class="rounded-lg border border-slate-300/80 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
			>
				<p
					class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"
				>
					<UIcon name="i-lucide-users" class="h-4 w-4" />
					{{ t('admin.overview.metrics.users') }}
				</p>
				<USkeleton v-if="pending" class="mt-3 h-9 w-20" />
				<p
					v-else
					class="mt-3 text-3xl font-semibold text-slate-950 dark:text-white"
				>
					{{ overview?.userCount ?? 0 }}
				</p>
				<p class="mt-3 text-sm text-slate-500 dark:text-slate-400">
					{{
						t('admin.overview.metrics.userDelta', {
							count: formatSignedCount(overview?.userDeltaSinceYesterday ?? 0),
						})
					}}
				</p>
			</div>

			<div
				class="rounded-lg border border-slate-300/80 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
			>
				<p
					class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"
				>
					<UIcon name="i-lucide-clock-3" class="h-4 w-4" />
					{{ t('admin.overview.metrics.uptimeDays') }}
				</p>
				<USkeleton v-if="pending" class="mt-3 h-9 w-28" />
				<p
					v-else
					class="mt-3 text-3xl font-semibold text-slate-950 dark:text-white"
				>
					{{ overview?.uptimeDays ?? t('admin.overview.metrics.unavailable') }}
				</p>
				<p class="mt-3 text-sm text-slate-500 dark:text-slate-400">
					{{
						overview?.runningSince
							? t('admin.overview.metrics.runningSince', {
									date: formatDate(overview.runningSince),
								})
							: t('admin.overview.metrics.runningSinceUnavailable')
					}}
				</p>
			</div>
		</section>

		<section class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
			<div
				class="rounded-lg border border-slate-300/80 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
			>
				<div class="flex items-center justify-between gap-4">
					<h2 class="text-base font-semibold text-slate-950 dark:text-white">
						{{ t('admin.overview.sections.serviceStatus') }}
					</h2>
					<UButton
						type="button"
						variant="link"
						color="primary"
						size="xs"
						disabled
					>
						{{ t('admin.overview.actions.viewAll') }}
					</UButton>
				</div>

				<div
					class="mt-4 flex flex-col divide-y divide-slate-200 dark:divide-slate-800"
				>
					<div
						v-for="service in serviceItems"
						:key="service.key"
						class="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
					>
						<div
							class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"
						>
							<UIcon :name="service.icon" class="h-4 w-4" />
						</div>
						<div class="min-w-0 flex-1">
							<p
								class="truncate text-sm font-medium text-slate-800 dark:text-slate-100"
							>
								{{ service.label }}
							</p>
							<p class="truncate text-xs text-slate-500 dark:text-slate-400">
								{{ service.description }}
							</p>
						</div>
						<div
							class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400"
						>
							<span
								class="h-2 w-2 rounded-full"
								:class="statusDotClass(service.status)"
							/>
							{{ statusText(service.status) }}
						</div>
					</div>
				</div>
			</div>

			<div
				class="rounded-lg border border-slate-300/80 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
			>
				<div class="flex items-center justify-between gap-4">
					<h2 class="text-base font-semibold text-slate-950 dark:text-white">
						{{ t('admin.overview.sections.recentActivity') }}
					</h2>
					<UButton
						type="button"
						variant="link"
						color="primary"
						size="xs"
						disabled
					>
						{{ t('admin.overview.actions.viewAllActivities') }}
					</UButton>
				</div>
				<div class="mt-8 flex flex-col items-center justify-center text-center">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"
					>
						<UIcon name="i-lucide-history" class="h-5 w-5" />
					</div>
					<p
						class="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200"
					>
						{{ t('admin.overview.audit.placeholderTitle') }}
					</p>
					<p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
						{{ t('admin.overview.audit.placeholderDescription') }}
					</p>
				</div>
			</div>

			<div
				class="rounded-lg border border-slate-300/80 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
			>
				<h2 class="text-base font-semibold text-slate-950 dark:text-white">
					{{ t('admin.overview.sections.quickActions') }}
				</h2>
				<div class="mt-4 flex flex-col gap-2">
					<UButton
						:to="localePath('/admin/servers')"
						color="neutral"
						variant="ghost"
						class="w-full justify-start gap-3 rounded-lg px-3 py-3 text-left"
					>
						<UIcon name="i-lucide-server" class="h-5 w-5 text-primary" />
						<span class="min-w-0 flex-1">
							<span class="block text-sm font-medium">
								{{ t('admin.overview.quickActions.servers') }}
							</span>
							<span
								class="block truncate text-xs text-slate-500 dark:text-slate-400"
							>
								{{ t('admin.overview.quickActions.serversDescription') }}
							</span>
						</span>
						<UIcon name="i-lucide-chevron-right" class="h-4 w-4 shrink-0" />
					</UButton>

					<UButton
						:to="localePath('/admin/users')"
						color="neutral"
						variant="ghost"
						class="w-full justify-start gap-3 rounded-lg px-3 py-3 text-left"
					>
						<UIcon name="i-lucide-users" class="h-5 w-5 text-primary" />
						<span class="min-w-0 flex-1">
							<span class="block text-sm font-medium">
								{{ t('admin.overview.quickActions.users') }}
							</span>
							<span
								class="block truncate text-xs text-slate-500 dark:text-slate-400"
							>
								{{ t('admin.overview.quickActions.usersDescription') }}
							</span>
						</span>
						<UIcon name="i-lucide-chevron-right" class="h-4 w-4 shrink-0" />
					</UButton>

					<UButton
						:to="localePath('/admin/attachments')"
						color="neutral"
						variant="ghost"
						class="w-full justify-start gap-3 rounded-lg px-3 py-3 text-left"
					>
						<UIcon name="i-lucide-paperclip" class="h-5 w-5 text-primary" />
						<span class="min-w-0 flex-1">
							<span class="block text-sm font-medium">
								{{ t('admin.overview.quickActions.attachments') }}
							</span>
							<span
								class="block truncate text-xs text-slate-500 dark:text-slate-400"
							>
								{{ t('admin.overview.quickActions.attachmentsDescription') }}
							</span>
						</span>
						<UIcon name="i-lucide-chevron-right" class="h-4 w-4 shrink-0" />
					</UButton>
				</div>
			</div>
		</section>

		<div
			v-if="pending"
			class="mt-8 flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
		>
			<UIcon name="i-lucide-loader-circle" class="h-4 w-4 animate-spin" />
			{{ t('admin.overview.loading') }}
		</div>
	</div>
</template>

<script setup lang="ts">
type OverviewStatus = 'normal' | 'error' | 'inactive'
type ServiceKey = 'postgresql' | 'authme' | 'luckperms' | 'portalBridge'

interface AdminOverviewService {
	key: ServiceKey
	status: OverviewStatus
	configuredCount?: number
	enabledCount?: number
}

interface AdminOverviewResponse {
	serverCount: number
	serverStatus: OverviewStatus
	userCount: number
	userDeltaSinceYesterday: number
	uptimeDays: number | null
	runningSince: string | null
	services: AdminOverviewService[]
}

interface ServiceItem {
	key: ServiceKey
	label: string
	description: string
	icon: string
	status: OverviewStatus
}

definePageMeta({
	headerVariant: 'solid',
	middleware: 'admin-auth',
})

const localePath = useLocalePath()
const { notifyError } = useAdminToast()
const { locale } = useI18n()

const {
	data: overview,
	pending,
	error,
} = await useFetch<AdminOverviewResponse>('/api/admin/overview')

const serviceIconMap: Record<ServiceKey, string> = {
	postgresql: 'i-lucide-database',
	authme: 'i-lucide-database',
	luckperms: 'i-lucide-database',
	portalBridge: 'i-lucide-radio-tower',
}

const statusDotClass = (status: OverviewStatus): string => {
	if (status === 'normal') {
		return 'bg-emerald-500'
	}

	if (status === 'error') {
		return 'bg-red-500'
	}

	return 'bg-slate-400 dark:bg-slate-500'
}

const statusText = (status: OverviewStatus): string =>
	t(`admin.overview.status.${status}`)

const formatSignedCount = (value: number): string =>
	value > 0 ? `+${value}` : String(value)

const formatDate = (value: string): string =>
	new Intl.DateTimeFormat(locale.value, {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).format(new Date(value))

const serviceItems = computed<ServiceItem[]>(() =>
	(overview.value?.services ?? []).map((service) => ({
		key: service.key,
		label: t(`admin.overview.services.${service.key}.label`),
		description:
			service.key === 'postgresql'
				? t(`admin.overview.services.${service.key}.description`)
				: t(`admin.overview.services.${service.key}.description`, {
						enabled: service.enabledCount ?? 0,
						configured: service.configuredCount ?? 0,
					}),
		icon: serviceIconMap[service.key],
		status: service.status,
	})),
)

watch(
	error,
	(value) => {
		if (value) {
			notifyError(value, {
				title: t('admin.notifications.overviewLoadFailed'),
			})
		}
	},
	{ immediate: true },
)
</script>
