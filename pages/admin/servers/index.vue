<template>
	<div class="-mt-2">
		<div
			class="flex flex-col gap-5 md:flex-row md:items-end md:justify-between"
		>
			<div>
				<h1 class="text-3xl font-semibold text-slate-950 dark:text-white">
					{{ t('admin.servers.title') }}
				</h1>
			</div>
			<UButton
				:to="localePath('/admin/servers/create')"
				icon="i-lucide-plus"
				size="lg"
			>
				{{ t('admin.servers.create') }}
			</UButton>
		</div>

		<div
			v-if="pending"
			class="mt-8 flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-8 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
		>
			<UIcon name="i-lucide-loader-circle" class="h-4 w-4 animate-spin" />
			{{ t('admin.servers.loading') }}
		</div>

		<div
			v-else-if="servers.length === 0"
			class="mt-8 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900"
		>
			<p class="text-lg font-semibold text-slate-950 dark:text-white">
				{{ t('admin.servers.empty.title') }}
			</p>
			<p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
				{{ t('admin.servers.empty.description') }}
			</p>
		</div>

		<section
			v-else
			class="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3"
		>
			<AdminServerCard
				v-for="server in servers"
				:key="server.id"
				:server="server"
				@open="openServer(server)"
			/>
		</section>
	</div>
</template>

<script setup lang="ts">
import AdminServerCard from '~/components/admin/AdminServerCard.vue'
import type {
	MinecraftServerSummary,
	MinecraftServersResponse,
} from '~/components/admin/types'

definePageMeta({
	headerVariant: 'solid',
	middleware: 'admin-auth',
})

const { notifyError } = useAdminToast()
const { data, pending, error } = await useFetch<MinecraftServersResponse>(
	'/api/minecraft/servers',
)

const localePath = useLocalePath()
const servers = computed(() => data.value?.servers ?? [])

watch(
	error,
	(value) => {
		if (value) {
			notifyError(value, {
				title: t('admin.notifications.serversLoadFailed'),
			})
		}
	},
	{ immediate: true },
)

const openServer = async (server: MinecraftServerSummary): Promise<void> => {
	await navigateTo(localePath(`/admin/servers/${server.serverId}`))
}
</script>
