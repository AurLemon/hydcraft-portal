<template>
	<form class="space-y-5" @submit.prevent="submit">
		<NuxtLink
			:to="localePath('/login')"
			class="inline-flex w-fit items-center gap-2 text-sm font-medium text-sky-600 transition hover:text-sky-500 dark:text-sky-300 dark:hover:text-sky-200"
		>
			<UIcon name="i-lucide-arrow-left" class="size-4" />
			{{ t('forgotPassword.actions.backToLogin') }}
		</NuxtLink>

		<div>
			<h1
				class="text-2xl font-semibold tracking-normal text-slate-950 dark:text-white"
			>
				{{ t('forgotPassword.title') }}
			</h1>
			<p class="text-sm leading-6 text-slate-600 dark:text-slate-300/80">
				{{ t('forgotPassword.description') }}
			</p>
		</div>

		<label
			class="mt-8 flex flex-col gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-100"
		>
			<span>{{ t('forgotPassword.fields.email') }}</span>
			<UInput
				v-model="form.email"
				type="email"
				required
				autocomplete="email"
				:placeholder="t('forgotPassword.placeholders.email')"
				size="lg"
				variant="outline"
			/>
		</label>

		<UButton
			type="submit"
			icon="i-lucide-mail"
			:loading="submitting"
			size="lg"
			class="w-full justify-center"
		>
			{{ t('forgotPassword.actions.submit') }}
		</UButton>
	</form>
</template>

<script setup lang="ts">
interface ForgotPasswordFormState {
	email: string
}

const localePath = useLocalePath()
const { requestPasswordReset } = usePortalAuth()
const { notifyError, notifySuccess } = useAdminToast()
const submitting = ref(false)
const form = reactive<ForgotPasswordFormState>({
	email: '',
})

const submit = async (): Promise<void> => {
	submitting.value = true

	try {
		await requestPasswordReset({
			email: form.email,
		})
		notifySuccess({
			title: t('forgotPassword.notifications.successTitle'),
			description: t('forgotPassword.notifications.successDescription'),
		})
	} catch (error) {
		notifyError(error, {
			title: t('forgotPassword.notifications.failedTitle'),
			description: t('forgotPassword.notifications.failedDescription'),
		})
	} finally {
		submitting.value = false
	}
}
</script>
