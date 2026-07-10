<template>
	<UModal
		:open="open"
		:title="t('admin.oauthClients.create.title')"
		:ui="{ content: 'max-w-2xl', body: 'overflow-y-auto' }"
		@update:open="handleOpenChange"
	>
		<template #body>
			<form
				v-if="!clientSecret"
				class="grid gap-5"
				@submit.prevent="createClient"
			>
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
						@click="handleOpenChange(false)"
					>
						{{ t('admin.actions.cancel') }}
					</UButton>
					<UButton type="submit" :loading="creating">
						{{ t('admin.oauthClients.create.action') }}
					</UButton>
				</div>
			</form>

			<div v-else class="grid gap-5">
				<code
					class="break-all rounded bg-slate-100 p-3 text-sm text-slate-800 dark:bg-slate-800 dark:text-slate-100"
					>{{ clientSecret }}</code
				>
				<div class="flex justify-end">
					<UButton @click="handleOpenChange(false)">
						{{ t('admin.actions.cancel') }}
					</UButton>
				</div>
			</div>
		</template>
	</UModal>
</template>

<script setup lang="ts">
interface AdminOAuthClientCreateModalProps {
	open: boolean
}

defineProps<AdminOAuthClientCreateModalProps>()

const emit = defineEmits<{
	'update:open': [value: boolean]
	created: []
}>()

const { t } = useI18n()
const { notifyError, notifySuccess } = useAdminToast()
const creating = ref(false)
const clientSecret = ref<string | null>(null)
const form = reactive({
	name: '',
	redirectUris: '',
	allowedScopes: ['openid', 'profile'],
})
const scopeItems = ['openid', 'profile', 'email', 'hydroline'].map((value) => ({
	label: value,
	value,
}))

const resetForm = (): void => {
	form.name = ''
	form.redirectUris = ''
	form.allowedScopes = ['openid', 'profile']
	clientSecret.value = null
}

const handleOpenChange = (value: boolean): void => {
	if (!value) {
		resetForm()
	}

	emit('update:open', value)
}

const createClient = async (): Promise<void> => {
	creating.value = true
	try {
		const result = await $fetch<{ clientSecret: string }>(
			'/api/admin/oauth-clients',
			{
				method: 'POST',
				body: {
					name: form.name,
					redirectUris: form.redirectUris
						.split('\n')
						.map((value) => value.trim())
						.filter(Boolean),
					allowedScopes: form.allowedScopes,
				},
			},
		)
		clientSecret.value = result.clientSecret
		emit('created')
		notifySuccess({ title: t('admin.oauthClients.notifications.created') })
	} catch (error) {
		notifyError(error)
	} finally {
		creating.value = false
	}
}
</script>
