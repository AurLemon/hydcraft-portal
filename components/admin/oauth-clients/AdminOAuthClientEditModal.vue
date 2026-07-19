<template>
	<UModal
		:open="open"
		:title="t('admin.oauthClients.edit.title')"
		:ui="{ content: 'max-w-2xl', body: 'overflow-y-auto' }"
		@update:open="$emit('update:open', $event)"
	>
		<template #body>
			<form class="grid gap-5" @submit.prevent="saveClient">
				<UFormField :label="t('admin.oauthClients.fields.clientId')">
					<UInput
						:model-value="client?.clientId ?? ''"
						class="w-full"
						readonly
					/>
				</UFormField>
				<UFormField :label="t('admin.oauthClients.fields.name')" required>
					<UInput v-model="form.name" class="w-full" required />
				</UFormField>
				<UFormField
					:label="t('admin.oauthClients.fields.redirectUris')"
					required
				>
					<UTextarea v-model="form.redirectUris" class="w-full" required />
				</UFormField>
				<UFormField :label="t('admin.oauthClients.fields.scopes')" required>
					<USelect
						v-model="form.allowedScopes"
						multiple
						:items="scopeItems"
						class="w-full"
					/>
				</UFormField>
				<div class="flex justify-end gap-3">
					<UButton
						color="neutral"
						variant="ghost"
						@click="$emit('update:open', false)"
					>
						{{ t('admin.actions.cancel') }}
					</UButton>
					<UButton type="submit" :loading="saving">
						{{ t('admin.actions.save') }}
					</UButton>
				</div>
			</form>
		</template>
	</UModal>
</template>

<script setup lang="ts">
interface OAuthClientEditable {
	id: string
	clientId: string
	name: string
	redirectUris: string[]
	allowedScopes: string[]
}

interface AdminOAuthClientEditModalProps {
	open: boolean
	client: OAuthClientEditable | null
}

const props = defineProps<AdminOAuthClientEditModalProps>()
const emit = defineEmits<{
	'update:open': [value: boolean]
	saved: []
}>()

const { t } = useI18n()
const { notifyError, notifySuccess } = useAdminToast()
const saving = ref(false)
const form = reactive({
	name: '',
	redirectUris: '',
	allowedScopes: [] as string[],
})
const scopeItems = ['profile', 'email', 'hydroline', 'directory.read'].map(
	(value) => ({
		label: value,
		value,
	}),
)

const syncForm = (): void => {
	if (!props.client) return
	form.name = props.client.name
	form.redirectUris = props.client.redirectUris.join('\n')
	form.allowedScopes = [...props.client.allowedScopes]
}

watch(
	() => [props.open, props.client] as const,
	([open]) => {
		if (open) syncForm()
	},
	{ immediate: true },
)

const saveClient = async (): Promise<void> => {
	if (!props.client) return
	saving.value = true
	try {
		await $fetch(`/api/admin/oauth-clients/${props.client.id}`, {
			method: 'PATCH',
			body: {
				name: form.name,
				redirectUris: form.redirectUris
					.split('\n')
					.map((value) => value.trim())
					.filter(Boolean),
				allowedScopes: form.allowedScopes,
			},
		})
		emit('saved')
		emit('update:open', false)
		notifySuccess({ title: t('admin.oauthClients.notifications.updated') })
	} catch (error) {
		notifyError(error)
	} finally {
		saving.value = false
	}
}
</script>
