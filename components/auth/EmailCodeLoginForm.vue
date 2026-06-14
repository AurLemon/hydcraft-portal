<template>
	<form class="space-y-5" @submit.prevent="submit">
		<Transition
			name="auth-height"
			mode="out-in"
			@before-enter="beforeEnter"
			@enter="enter"
			@after-enter="afterEnter"
			@before-leave="beforeLeave"
			@leave="leave"
		>
			<div v-if="step === 'email'" key="email" class="overflow-hidden">
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
							:disabled="resendCountdown > 0 || submitting"
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

const getRedirectPath = (): string =>
	normalizePortalRedirectPath(route.query.redirect, {
		fallbackPath:
			props.intent === 'REGISTER' ? localePath('/me/profile') : localePath('/'),
		loginPath: localePath('/login'),
	})

const resetCodeStep = (): void => {
	form.code = ''
	stopResendCountdown()
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
	if (step.value === 'email') {
		await sendCode()
		return
	}

	await confirmCode()
}

const sendCode = async (): Promise<void> => {
	if (!normalizedEmail.value) {
		return
	}

	submitting.value = true

	try {
		await requestEmailCodeLogin({
			email: normalizedEmail.value,
			intent: props.intent,
			locale: locale.value,
		})
		step.value = 'code'
		startResendCountdown()
		notifySuccess({
			title: t('emailCodeLogin.notifications.codeSentTitle'),
			description: t('emailCodeLogin.notifications.codeSentDescription'),
		})
	} catch (error) {
		notifyError(error)
	} finally {
		submitting.value = false
	}
}

const resendCode = async (): Promise<void> => {
	if (resendCountdown.value > 0 || submitting.value) {
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

const beforeEnter = (element: Element): void => {
	const htmlElement = element as HTMLElement
	htmlElement.style.height = '0'
	htmlElement.style.opacity = '0'
}

const enter = (element: Element, done: () => void): void => {
	const htmlElement = element as HTMLElement
	htmlElement.style.height = `${htmlElement.scrollHeight}px`
	htmlElement.style.opacity = '1'
	window.setTimeout(done, 220)
}

const afterEnter = (element: Element): void => {
	const htmlElement = element as HTMLElement
	htmlElement.style.height = 'auto'
	htmlElement.style.opacity = ''
}

const beforeLeave = (element: Element): void => {
	const htmlElement = element as HTMLElement
	htmlElement.style.height = `${htmlElement.scrollHeight}px`
	htmlElement.style.opacity = '1'
}

const leave = (element: Element, done: () => void): void => {
	const htmlElement = element as HTMLElement
	requestAnimationFrame(() => {
		htmlElement.style.height = '0'
		htmlElement.style.opacity = '0'
	})
	window.setTimeout(done, 220)
}

onBeforeUnmount(() => {
	stopResendCountdown()
})
</script>

<style scoped>
.auth-height-enter-active,
.auth-height-leave-active {
	transition:
		height 220ms ease,
		opacity 180ms ease;
}
</style>
