<template>
	<form class="space-y-5" @submit.prevent="submit">
		<div v-if="!embedded">
			<NuxtLink
				:to="localePath('/login')"
				class="inline-flex w-fit items-center gap-2 text-sm font-medium text-sky-600 transition hover:text-sky-500 dark:text-sky-300 dark:hover:text-sky-200"
			>
				<UIcon name="i-lucide-arrow-left" class="size-4" />
				{{ t('forgotPassword.actions.backToLogin') }}
			</NuxtLink>
		</div>

		<div v-if="!embedded">
			<h1
				class="text-2xl font-semibold tracking-normal text-slate-950 dark:text-white"
			>
				{{ t('forgotPassword.title') }}
			</h1>
			<p class="text-sm leading-6 text-slate-600 dark:text-slate-300/80">
				{{ t('forgotPassword.description') }}
			</p>
		</div>

		<Transition name="auth-height" mode="out-in">
			<div
				v-if="step === 'email'"
				key="email"
				class="space-y-4 overflow-hidden"
			>
				<label
					class="flex flex-col gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-100"
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

				<TurnstileWidget
					ref="captchaWidgetRef"
					v-model="captcha.token.value"
					:action="TURNSTILE_ACTIONS.PASSWORD_RESET"
				/>
			</div>
			<div v-else key="confirm" class="space-y-4 overflow-hidden">
				<label
					class="flex flex-col gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-100"
				>
					<span>{{ t('resetPassword.fields.email') }}</span>
					<UInput
						:model-value="normalizedEmail"
						type="email"
						disabled
						size="lg"
						variant="outline"
					/>
				</label>
				<label
					class="flex flex-col gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-100"
				>
					<span>{{ t('resetPassword.fields.code') }}</span>
					<UInput
						v-model="form.code"
						type="text"
						inputmode="numeric"
						maxlength="6"
						required
						autocomplete="one-time-code"
						:placeholder="t('resetPassword.placeholders.code')"
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
				<p class="text-sm leading-6 text-slate-600 dark:text-slate-300/80">
					{{ t('resetPassword.sentTo') }}
					<span class="font-medium">{{ normalizedEmail }}</span>
					<button
						type="button"
						class="ml-2 font-medium text-sky-600 transition hover:text-sky-500 dark:text-sky-300 dark:hover:text-sky-200"
						@click="resetConfirmStep"
					>
						{{ t('resetPassword.actions.changeEmail') }}
					</button>
				</p>
			</div>
		</Transition>

		<UButton
			type="submit"
			:icon="step === 'confirm' ? 'i-lucide-key-round' : 'i-lucide-mail'"
			:loading="submitting"
			:disabled="submitDisabled"
			size="lg"
			class="w-full justify-center"
		>
			{{
				step === 'confirm'
					? t('resetPassword.actions.submit')
					: t('forgotPassword.actions.submit')
			}}
		</UButton>
	</form>
</template>

<script setup lang="ts">
import { TURNSTILE_ACTIONS } from '~/utils/security/turnstile-actions'
interface ForgotPasswordFormProps {
	embedded?: boolean
}

interface ForgotPasswordFormState {
	email: string
	code: string
	password: string
}

withDefaults(defineProps<ForgotPasswordFormProps>(), {
	embedded: false,
})

const localePath = useLocalePath()
const { locale, t } = useI18n()
const { requestPasswordReset, resetPassword } = usePortalAuth()
const { notifyError, notifySuccess } = useAdminToast()
const submitting = ref(false)
const step = ref<'email' | 'confirm'>('email')
const passwordVisible = ref(false)
const captcha = useTurnstile(true)
const captchaWidgetRef = ref<{ reset: () => void } | null>(null)
const form = reactive<ForgotPasswordFormState>({
	email: '',
	code: '',
	password: '',
})
const normalizedEmail = computed(() => form.email.trim())
const submitDisabled = computed(() =>
	step.value === 'email'
		? !normalizedEmail.value || !captcha.token.value || submitting.value
		: !normalizedEmail.value ||
			!form.code.trim() ||
			!form.password ||
			submitting.value,
)

const resetCaptcha = (): void => {
	captcha.reset(true)
	captchaWidgetRef.value?.reset()
}

const resetConfirmStep = (): void => {
	form.code = ''
	form.password = ''
	passwordVisible.value = false
	resetCaptcha()
	step.value = 'email'
}

const submit = async (): Promise<void> => {
	if (submitDisabled.value) {
		return
	}

	if (step.value === 'confirm') {
		await confirmPasswordReset()
		return
	}

	submitting.value = true

	try {
		await requestPasswordReset({
			email: normalizedEmail.value,
			locale: locale.value,
			captchaToken: captcha.consumeToken(),
		})
		step.value = 'confirm'
		resetCaptcha()
		notifySuccess({
			title: t('forgotPassword.notifications.successTitle'),
			description: t('forgotPassword.notifications.successDescription'),
		})
	} catch (error) {
		resetCaptcha()
		notifyError(error, {
			title: t('forgotPassword.notifications.failedTitle'),
			description: t('forgotPassword.notifications.failedDescription'),
		})
	} finally {
		submitting.value = false
	}
}

const confirmPasswordReset = async (): Promise<void> => {
	submitting.value = true

	try {
		await resetPassword({
			email: normalizedEmail.value,
			code: form.code.trim(),
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
