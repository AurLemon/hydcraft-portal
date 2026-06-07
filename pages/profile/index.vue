<template>
	<div class="site-shell mx-auto -mt-2 px-6 pb-16">
		<section class="max-w-2xl">
			<h1 class="text-3xl font-semibold text-slate-950 dark:text-white">
				{{ t('profile.title') }}
			</h1>

			<form class="mt-6 flex flex-col gap-4" @submit.prevent="submit">
				<label class="flex flex-col gap-1.5 text-sm font-medium">
					<span>{{ t('profile.fields.handle') }}</span>
					<UInput :model-value="user?.handle ?? ''" disabled />
				</label>
				<label class="flex flex-col gap-1.5 text-sm font-medium">
					<span>{{ t('profile.fields.displayName') }}</span>
					<UInput v-model="form.displayName" />
				</label>
				<label class="flex flex-col gap-1.5 text-sm font-medium">
					<span>{{ t('profile.fields.avatarUrl') }}</span>
					<UInput v-model="form.avatarUrl" type="url" />
				</label>
				<label class="flex flex-col gap-1.5 text-sm font-medium">
					<span>{{ t('profile.fields.bio') }}</span>
					<UTextarea v-model="form.bio" :rows="5" />
				</label>

				<div class="flex justify-end">
					<UButton type="submit" icon="i-lucide-save" :loading="submitting">
						{{ t('profile.actions.save') }}
					</UButton>
				</div>
			</form>
		</section>
	</div>
</template>

<script setup lang="ts">
definePageMeta({
	headerVariant: 'solid',
	middleware: 'portal-auth',
})

interface ProfileForm {
	displayName: string
	avatarUrl: string
	bio: string
}

const { user, fetchCurrentUser } = usePortalAuth()
const { notifyError, notifySuccess } = useAdminToast()
const submitting = ref(false)
const form = reactive<ProfileForm>({
	displayName: '',
	avatarUrl: '',
	bio: '',
})

watch(
	user,
	(value) => {
		form.displayName = value?.displayName ?? ''
		form.avatarUrl = value?.avatarUrl ?? ''
		form.bio = value?.bio ?? ''
	},
	{
		immediate: true,
	},
)

const submit = async (): Promise<void> => {
	submitting.value = true

	try {
		await $fetch('/api/users/me', {
			method: 'PATCH',
			body: form,
		})
		await fetchCurrentUser()
		notifySuccess({
			title: t('profile.notifications.saved'),
			description: t('profile.notifications.savedDescription'),
		})
	} catch (error) {
		notifyError(error, {
			title: t('profile.notifications.saveFailed'),
			description: t('profile.notifications.saveFailedDescription'),
		})
	} finally {
		submitting.value = false
	}
}
</script>
