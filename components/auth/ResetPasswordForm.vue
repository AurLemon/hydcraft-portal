<template>
	<form class="space-y-5" @submit.prevent="submit">
		<div>
			<h1
				class="text-2xl font-semibold tracking-normal text-slate-950 dark:text-white"
			>
				{{ t('resetPassword.title') }}
			</h1>
			<p class="text-sm leading-6 text-slate-600 dark:text-slate-300/80">
				{{ t('resetPassword.description') }}
			</p>
		</div>

		<label
			class="flex flex-col gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-100"
		>
			<span>{{ t('resetPassword.fields.token') }}</span>
			<UInput
				v-model="form.token"
				required
				autocomplete="one-time-code"
				:placeholder="t('resetPassword.placeholders.token')"
				size="lg"
				variant="outline"
			/>
		</label>

		<label
			class="flex flex-col gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-100"
		>
			<span>{{ t('resetPassword.fields.password') }}</span>
			<UInput
				v-model="form.password"
				:type="passwordVisible ? 'text' : 'password'"
				required
				autocomplete="new-password"
				:placeholder="t('resetPassword.placeholders.password')"
				size="lg"
				variant="outline"
			>
				<template #trailing>
					<UButton
						type="button"
						color="neutral"
						variant="ghost"
						size="xs"
						:icon="passwordVisible ? 'i-lucide-eye-off' : 'i-lucide-eye'"
						:aria-label="t('auth.actions.togglePassword')"
						@click="passwordVisible = !passwordVisible"
					/>
				</template>
			</UInput>
		</label>

		<UButton
			type="submit"
			icon="i-lucide-key-round"
			:loading="submitting"
			size="lg"
			class="w-full justify-center"
		>
			{{ t('resetPassword.actions.submit') }}
		</UButton>

		<NuxtLink
			:to="localePath('/login')"
			class="inline-flex items-center gap-2 text-sm font-medium text-sky-600 transition hover:text-sky-500 dark:text-sky-300 dark:hover:text-sky-200"
		>
			<UIcon name="i-lucide-arrow-left" class="size-4" />
			{{ t('resetPassword.actions.backToLogin') }}
		</NuxtLink>
	</form>
</template>

<script setup lang="ts">
interface ResetPasswordFormState {
	token: string
	password: string
}

const route = useRoute()
const localePath = useLocalePath()
const { resetPassword } = usePortalAuth()
const { notifyError, notifySuccess } = useAdminToast()
const submitting = ref(false)
const passwordVisible = ref(false)
const form = reactive<ResetPasswordFormState>({
	token: typeof route.query.token === 'string' ? route.query.token : '',
	password: '',
})

const submit = async (): Promise<void> => {
	submitting.value = true

	try {
		await resetPassword({
			token: form.token,
			password: form.password,
		})
		notifySuccess({
			title: t('resetPassword.notifications.successTitle'),
			description: t('resetPassword.notifications.successDescription'),
		})
		await navigateTo(localePath('/login'))
	} catch (error) {
		notifyError(error, {
			title: t('resetPassword.notifications.failedTitle'),
			description: t('resetPassword.notifications.failedDescription'),
		})
	} finally {
		submitting.value = false
	}
}
</script>
