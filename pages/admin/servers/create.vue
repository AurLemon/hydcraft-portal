<template>
	<div>
		<div
			class="flex flex-col gap-5 md:flex-row md:items-end md:justify-between"
		>
			<div>
				<UButton
					:to="localePath('/admin/servers')"
					color="primary"
					variant="ghost"
					icon="i-lucide-arrow-left"
					class="-ml-2 mb-3"
				>
					{{ t('admin.serverDetail.back') }}
				</UButton>
				<h1 class="text-3xl font-semibold text-slate-950 dark:text-white">
					{{ t('admin.serverCreate.title') }}
				</h1>
			</div>
		</div>

		<section class="mt-8">
			<AdminServerConfigForm
				:server="null"
				mode="all"
				:show-cancel="false"
				@saved="handleSaved"
			/>
		</section>
	</div>
</template>

<script setup lang="ts">
import AdminServerConfigForm from '~/components/admin/AdminServerConfigForm.vue'
import type { MinecraftServerSummary } from '~/components/admin/types'

definePageMeta({
	headerVariant: 'solid',
	middleware: 'admin-auth',
})

const { t } = useI18n()
const localePath = useLocalePath()
const { notifySuccess } = useAdminToast()

const handleSaved = async (server: MinecraftServerSummary): Promise<void> => {
	notifySuccess({
		title: t('admin.notifications.serverSaved'),
		description: t('admin.notifications.serverSavedDescription'),
	})
	await navigateTo(localePath(`/admin/servers/${server.serverId}`))
}
</script>
