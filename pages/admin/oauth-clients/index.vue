<template>
	<div>
		<div
			class="flex flex-col gap-5 md:flex-row md:items-end md:justify-between"
		>
			<h1 class="text-3xl font-semibold text-slate-950 dark:text-white">
				{{ t('admin.oauthClients.title') }}
			</h1>
			<UButton icon="i-lucide-plus" size="lg" @click="createModalOpen = true">
				{{ t('admin.oauthClients.create.action') }}
			</UButton>
		</div>

		<section
			class="mt-6 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
		>
			<UTable :data="clients" :columns="columns" :loading="pending">
				<template #redirectUris-cell="{ row }">
					<span class="block max-w-md truncate text-sm">{{
						row.original.redirectUris.join(', ')
					}}</span>
				</template>
				<template #scopes-cell="{ row }">
					<span class="text-sm">{{
						row.original.allowedScopes.join(' ')
					}}</span>
				</template>
				<template #enabled-cell="{ row }">
					<USwitch
						:model-value="row.original.enabled"
						@update:model-value="setEnabled(row.original, $event)"
					/>
				</template>
				<template #actions-cell="{ row }">
					<div class="flex items-center gap-1">
						<UButton
							type="button"
							size="xs"
							color="neutral"
							variant="ghost"
							icon="i-lucide-pencil"
							@click="openEditModal(row.original)"
						/>
						<UButton
							type="button"
							size="xs"
							color="error"
							variant="ghost"
							icon="i-lucide-trash-2"
							@click="openDeleteModal(row.original)"
						/>
					</div>
				</template>
			</UTable>
		</section>

		<AdminOAuthClientCreateModal
			v-model:open="createModalOpen"
			@created="refresh"
		/>
		<AdminOAuthClientEditModal
			v-model:open="editModalOpen"
			:client="editingClient"
			@saved="refresh"
		/>
		<UModal
			:open="deleteModalOpen"
			:title="t('admin.oauthClients.delete.title')"
			:ui="{ content: 'max-w-md' }"
			@update:open="handleDeleteModalOpenChange"
		>
			<template #body>
				<p class="text-sm text-slate-600 dark:text-slate-300">
					{{
						t('admin.oauthClients.delete.description', {
							name: deletingClient?.name ?? '',
						})
					}}
				</p>
				<div class="mt-6 flex justify-end gap-3">
					<UButton
						color="neutral"
						variant="ghost"
						@click="handleDeleteModalOpenChange(false)"
					>
						{{ t('admin.actions.cancel') }}
					</UButton>
					<UButton color="error" :loading="deleting" @click="deleteClient">
						{{ t('admin.actions.delete') }}
					</UButton>
				</div>
			</template>
		</UModal>
	</div>
</template>

<script setup lang="ts">
definePageMeta({ headerVariant: 'solid', middleware: 'admin-auth' })

interface OAuthClientSummary {
	id: string
	clientId: string
	name: string
	redirectUris: string[]
	allowedScopes: string[]
	enabled: boolean
}

const { t } = useI18n()
const { notifyError, notifySuccess } = useAdminToast()
const createModalOpen = ref(false)
const editModalOpen = ref(false)
const editingClient = ref<OAuthClientSummary | null>(null)
const deleteModalOpen = ref(false)
const deletingClient = ref<OAuthClientSummary | null>(null)
const deleting = ref(false)
const { data, pending, error, refresh } = await useFetch<{
	items: OAuthClientSummary[]
}>('/api/admin/oauth-clients')
const clients = computed(() => data.value?.items ?? [])
const columns = [
	{ accessorKey: 'name', header: t('admin.oauthClients.fields.name') },
	{ accessorKey: 'clientId', header: t('admin.oauthClients.fields.clientId') },
	{ id: 'redirectUris', header: t('admin.oauthClients.fields.redirectUris') },
	{ id: 'scopes', header: t('admin.oauthClients.fields.scopes') },
	{ id: 'enabled', header: t('admin.oauthClients.fields.enabled') },
	{ id: 'actions', header: '' },
]

watch(error, (value) => value && notifyError(value), { immediate: true })

const openEditModal = (client: OAuthClientSummary): void => {
	editingClient.value = client
	editModalOpen.value = true
}

const openDeleteModal = (client: OAuthClientSummary): void => {
	deletingClient.value = client
	deleteModalOpen.value = true
}

const handleDeleteModalOpenChange = (open: boolean): void => {
	deleteModalOpen.value = open
	if (!open) deletingClient.value = null
}

const deleteClient = async (): Promise<void> => {
	if (!deletingClient.value) return
	deleting.value = true
	try {
		await $fetch(`/api/admin/oauth-clients/${deletingClient.value.id}`, {
			method: 'DELETE',
		})
		await refresh()
		handleDeleteModalOpenChange(false)
		notifySuccess({ title: t('admin.oauthClients.notifications.deleted') })
	} catch (error) {
		notifyError(error)
	} finally {
		deleting.value = false
	}
}

const setEnabled = async (client: OAuthClientSummary, enabled: boolean) => {
	try {
		await $fetch(`/api/admin/oauth-clients/${client.id}`, {
			method: 'PATCH',
			body: { enabled },
		})
		await refresh()
	} catch (error) {
		notifyError(error)
	}
}
</script>
