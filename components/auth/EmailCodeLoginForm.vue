<template>
	<form class="space-y-5" @submit.prevent="submit">
		<Transition name="auth-height" mode="out-in">
			<div
				v-if="step === 'email'"
				key="email"
				class="space-y-4 overflow-hidden"
			>
				<label
					class="flex flex-col gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-100"
				>
					<span>{{ t('emailCodeLogin.fields.email') }}</span>
					<UInput
						v-model="form.email"
						type="email"
						required
						autocomplete="email"
						:placeholder="t('emailCodeLogin.placeholders.email')"
						size="lg"
						variant="outline"
					/>
				</label>
				<CapWidget ref="captchaWidgetRef" v-model="captcha.token.value" />
			</div>
			<div v-else key="code" class="overflow-hidden">
				<div class="space-y-2">
					<label
						class="flex flex-col gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-100"
					>
						<span>{{ t('emailCodeLogin.fields.code') }}</span>
						<UInput
							v-model="form.code"
							type="text"
							inputmode="numeric"
							maxlength="6"
							required
							autocomplete="one-time-code"
							:placeholder="t('emailCodeLogin.placeholders.code')"
							size="lg"
							variant="outline"
						/>
					</label>
					<p class="text-sm leading-6 text-slate-600 dark:text-slate-300/80">
						{{ t('emailCodeLogin.sentTo') }}
						<span class="font-medium">{{ normalizedEmail }}</span>
						<button
							type="button"
							class="ml-2 font-medium text-sky-600 transition hover:text-sky-500 dark:text-sky-300 dark:hover:text-sky-200"
							@click="resetCodeStep"
						>
							{{ t('emailCodeLogin.actions.changeEmail') }}
						</button>
					</p>
					<div class="flex items-center gap-3">
						<UButton
							type="button"
							variant="ghost"
							color="neutral"
							:icon="
								resendCountdown > 0 ? 'i-lucide-clock-3' : 'i-lucide-refresh-cw'
							"
							:disabled="
								resendCountdown > 0 ||
								submitting ||
								!normalizedEmail ||
								!captcha.token.value
							"
							@click="resendCode"
						>
							{{ resendLabel }}
						</UButton>
					</div>
				</div>
			</div>
		</Transition>

		<UButton
			type="submit"
			:icon="step === 'code' ? 'i-lucide-log-in' : 'i-lucide-mail'"
			:loading="submitting"
			:disabled="submitDisabled"
			size="lg"
			class="w-full justify-center"
		>
			{{
				step === 'code'
					? t(submitCodeKey)
					: t('emailCodeLogin.actions.sendCode')
			}}
		</UButton>
	</form>
</template>

<script setup lang="ts">
import { normalizePortalRedirectPath } from '~/utils/auth/redirect'

interface EmailCodeLoginFormProps {
	intent?: 'LOGIN' | 'REGISTER'
}

interface EmailCodeLoginFormState {
	email: string
	code: string
}

const props = withDefaults(defineProps<EmailCodeLoginFormProps>(), {
	intent: 'LOGIN',
})

const route = useRoute()
const localePath = useLocalePath()
const { locale, t } = useI18n()
const { loginWithEmailCode, requestEmailCodeLogin } = usePortalAuth()
const { notifyError, notifySuccess } = useAdminToast()
const submitting = ref(false)
const resendCountdown = ref(0)
let resendTimer: number | null = null
const step = ref<'email' | 'code'>('email')
const captcha = useCap(true)
const captchaWidgetRef = ref<{ reset: () => void } | null>(null)
const form = reactive<EmailCodeLoginFormState>({
	email: '',
	code: '',
})

const submitCodeKey = computed(() =>
	props.intent === 'REGISTER'
		? 'emailCodeLogin.actions.register'
		: 'emailCodeLogin.actions.login',
)
const normalizedEmail = computed(() => form.email.trim())
const resendLabel = computed(() =>
	resendCountdown.value > 0
		? t('emailCodeLogin.actions.resendAfter', {
				seconds: resendCountdown.value,
			})
		: t('emailCodeLogin.actions.resendCode'),
)
const sendCodeDisabled = computed(
	() =>
		step.value === 'email' &&
		(!normalizedEmail.value || !captcha.token.value || submitting.value),
)
const confirmCodeDisabled = computed(
	() =>
		step.value === 'code' &&
		(!normalizedEmail.value || !form.code || submitting.value),
)
const submitDisabled = computed(
	() => sendCodeDisabled.value || confirmCodeDisabled.value,
)

const getRedirectPath = (): string =>
	normalizePortalRedirectPath(route.query.redirect, {
		fallbackPath:
			props.intent === 'REGISTER' ? localePath('/me/profile') : localePath('/'),
		loginPath: localePath('/login'),
	})

const resetCaptcha = (): void => {
	captcha.reset(true)
	captchaWidgetRef.value?.reset()
}

const resetCodeStep = (): void => {
	form.code = ''
	stopResendCountdown()
	resetCaptcha()
	step.value = 'email'
}

const stopResendCountdown = (): void => {
	if (resendTimer) {
		window.clearInterval(resendTimer)
		resendTimer = null
	}
	resendCountdown.value = 0
}

const startResendCountdown = (): void => {
	stopResendCountdown()
	resendCountdown.value = 60
	resendTimer = window.setInterval(() => {
		if (resendCountdown.value <= 1) {
			stopResendCountdown()
			return
		}

		resendCountdown.value -= 1
	}, 1000)
}

const submit = async (): Promise<void> => {
	if (submitDisabled.value) {
		return
	}

	if (step.value === 'email') {
		await sendCode()
		return
	}

	await confirmCode()
}

const sendCode = async (): Promise<void> => {
	if (!normalizedEmail.value || !captcha.token.value || submitting.value) {
		return
	}

	submitting.value = true

	try {
		await requestEmailCodeLogin({
			email: normalizedEmail.value,
			intent: props.intent,
			locale: locale.value,
			captchaToken: captcha.consumeToken(),
		})
		step.value = 'code'
		resetCaptcha()
		startResendCountdown()
		notifySuccess({
			title: t('emailCodeLogin.notifications.codeSentTitle'),
			description: t('emailCodeLogin.notifications.codeSentDescription'),
		})
	} catch (error) {
		resetCaptcha()
		notifyError(error)
	} finally {
		submitting.value = false
	}
}

const resendCode = async (): Promise<void> => {
	if (
		resendCountdown.value > 0 ||
		submitting.value ||
		!normalizedEmail.value ||
		!captcha.token.value
	) {
		return
	}

	await sendCode()
}

const confirmCode = async (): Promise<void> => {
	if (!normalizedEmail.value || !form.code) {
		return
	}

	submitting.value = true

	try {
		await loginWithEmailCode({
			email: normalizedEmail.value,
			code: form.code,
			intent: props.intent,
		})
		notifySuccess({
			title:
				props.intent === 'REGISTER'
					? t('emailCodeLogin.notifications.registerSuccessTitle')
					: t('emailCodeLogin.notifications.successTitle'),
		})
		await navigateTo(getRedirectPath())
	} catch (error) {
		notifyError(error, {
			title: t('emailCodeLogin.notifications.failedTitle'),
			description: t('emailCodeLogin.notifications.failedDescription'),
		})
	} finally {
		submitting.value = false
	}
}

onBeforeUnmount(() => {
	stopResendCountdown()
})
</script>

<style scoped>
.auth-height-enter-active,
.auth-height-leave-active {
	transition:
		grid-template-rows 360ms cubic-bezier(0.22, 1, 0.36, 1),
		opacity 240ms ease,
		transform 320ms ease;
	display: grid;
	overflow: hidden;
}

.auth-height-enter-active > *,
.auth-height-leave-active > * {
	min-height: 0;
}

.auth-height-enter-from,
.auth-height-leave-to {
	grid-template-rows: 0fr;
	opacity: 0;
	transform: translateY(-6px);
}

.auth-height-enter-to,
.auth-height-leave-from {
	grid-template-rows: 1fr;
	opacity: 1;
	transform: translateY(0);
}
</style>
