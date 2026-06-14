<template>
	<div class="space-y-5">
		<div>
			<h1
				class="text-2xl font-semibold tracking-normal text-slate-950 dark:text-white"
			>
				{{ t('register.title') }}
			</h1>
			<p class="text-sm leading-6 text-slate-600 dark:text-slate-300/80">
				{{ t('register.description') }}
			</p>
		</div>

		<form class="space-y-5" @submit.prevent="submit">
			<Transition name="auth-panel" mode="out-in">
				<div class="space-y-4">
					<div
						v-if="step === 'details'"
						key="details"
						class="space-y-4 overflow-hidden"
					>
						<label
							class="flex flex-col gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-100"
						>
							<span>{{ t('register.fields.handle') }}</span>
							<UInput
								v-model="form.handle"
								required
								autocomplete="username"
								:placeholder="t('register.placeholders.handle')"
								size="lg"
								variant="outline"
							/>
						</label>
						<label
							class="flex flex-col gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-100"
						>
							<span>{{ t('register.fields.email') }}</span>
							<UInput
								v-model="form.email"
								type="email"
								required
								autocomplete="email"
								:placeholder="t('register.placeholders.email')"
								size="lg"
								variant="outline"
							/>
						</label>
						<label
							class="flex flex-col gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-100"
						>
							<span>{{ t('register.fields.password') }}</span>
							<UInput
								v-model="form.password"
								:type="passwordVisible ? 'text' : 'password'"
								required
								autocomplete="new-password"
								:placeholder="t('register.placeholders.password')"
								size="lg"
								variant="outline"
							>
								<template #trailing>
									<UButton
										type="button"
										color="neutral"
										variant="ghost"
										size="xs"
										:icon="
											passwordVisible ? 'i-lucide-eye-off' : 'i-lucide-eye'
										"
										:aria-label="t('auth.actions.togglePassword')"
										@click="passwordVisible = !passwordVisible"
									/>
								</template>
							</UInput>
						</label>
						<CapWidget ref="captchaWidgetRef" v-model="captcha.token.value" />
					</div>
					<div v-else key="code" class="space-y-3 overflow-hidden">
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
						<CapWidget ref="captchaWidgetRef" v-model="captcha.token.value" />
					</div>
				</div>
			</Transition>

			<UButton
				type="submit"
				:icon="step === 'code' ? 'i-lucide-user-plus' : 'i-lucide-mail'"
				:loading="submitting"
				:disabled="submitDisabled"
				size="lg"
				class="w-full justify-center"
			>
				{{ t(submitLabelKey) }}
			</UButton>

			<p class="text-center text-sm text-slate-600 dark:text-slate-300/80">
				{{ t('register.loginPrompt.text') }}
				<NuxtLink
					:to="loginRoute"
					class="font-medium text-sky-600 transition hover:text-sky-500 dark:text-sky-300 dark:hover:text-sky-200"
				>
					{{ t('register.loginPrompt.action') }}
				</NuxtLink>
			</p>

			<AuthProviderList />
		</form>
	</div>
</template>

<script setup lang="ts">
import { normalizePortalRedirectPath } from '~/utils/auth/redirect'

interface RegisterFormState {
	handle: string
	email: string
	password: string
	code: string
}

const route = useRoute()
const localePath = useLocalePath()
const { locale, t } = useI18n()
const { register, requestEmailCodeLogin } = usePortalAuth()
const { notifyError, notifySuccess } = useAdminToast()
const submitting = ref(false)
const passwordVisible = ref(false)
const step = ref<'details' | 'code'>('details')
const resendCountdown = ref(0)
let resendTimer: number | null = null
const captcha = useCap(true)
const captchaWidgetRef = ref<{ reset: () => void } | null>(null)
const form = reactive<RegisterFormState>({
	handle: '',
	email: '',
	password: '',
	code: '',
})

const normalizedEmail = computed(() => form.email.trim())
const submitLabelKey = computed(() =>
	step.value === 'code'
		? 'register.actions.submit'
		: 'register.actions.sendCode',
)
const resendLabel = computed(() =>
	resendCountdown.value > 0
		? t('emailCodeLogin.actions.resendAfter', {
				seconds: resendCountdown.value,
			})
		: t('emailCodeLogin.actions.resendCode'),
)
const sendCodeDisabled = computed(
	() =>
		step.value === 'details' &&
		(!form.handle ||
			!normalizedEmail.value ||
			!form.password ||
			!captcha.token.value ||
			submitting.value),
)
const confirmRegisterDisabled = computed(
	() =>
		step.value === 'code' &&
		(!form.handle ||
			!normalizedEmail.value ||
			!form.password ||
			!form.code ||
			!captcha.token.value ||
			submitting.value),
)
const submitDisabled = computed(
	() => sendCodeDisabled.value || confirmRegisterDisabled.value,
)
const loginRoute = computed(() => ({
	path: localePath('/login'),
	query: route.query.redirect ? { redirect: route.query.redirect } : {},
}))

const resetCaptcha = (): void => {
	captcha.reset(true)
	captchaWidgetRef.value?.reset()
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

const resetCodeStep = (): void => {
	form.code = ''
	stopResendCountdown()
	resetCaptcha()
	step.value = 'details'
}

const getRedirectPath = (): string => {
	return normalizePortalRedirectPath(route.query.redirect, {
		fallbackPath: localePath('/me/profile'),
		loginPath: localePath('/login'),
	})
}

const submit = async (): Promise<void> => {
	if (submitDisabled.value) {
		return
	}

	if (step.value === 'details') {
		await sendRegisterCode()
		return
	}

	await confirmRegister()
}

const sendRegisterCode = async (): Promise<void> => {
	if (
		!form.handle ||
		!normalizedEmail.value ||
		!form.password ||
		!captcha.token.value ||
		submitting.value
	) {
		return
	}

	submitting.value = true

	try {
		await requestEmailCodeLogin({
			email: normalizedEmail.value,
			intent: 'REGISTER',
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

	await sendRegisterCode()
}

const confirmRegister = async (): Promise<void> => {
	if (!form.handle || !normalizedEmail.value || !form.password || !form.code) {
		return
	}

	if (!captcha.token.value || submitting.value) {
		return
	}

	submitting.value = true

	try {
		await register({
			handle: form.handle,
			email: normalizedEmail.value,
			password: form.password,
			code: form.code,
			captchaToken: captcha.consumeToken(),
		})
		notifySuccess({
			title: t('register.notifications.successTitle'),
			description: t('register.notifications.successDescription'),
		})
		await navigateTo(getRedirectPath())
	} catch (error) {
		resetCaptcha()
		notifyError(error, {
			title: t('register.notifications.failedTitle'),
			description: t('register.notifications.failedDescription'),
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
.auth-panel-enter-active,
.auth-panel-leave-active,
.auth-back-enter-active,
.auth-back-leave-active {
	transition:
		grid-template-rows 360ms cubic-bezier(0.22, 1, 0.36, 1),
		opacity 240ms ease,
		transform 320ms ease;
	display: grid;
	overflow: hidden;
}

.auth-panel-enter-active > *,
.auth-panel-leave-active > *,
.auth-back-enter-active > *,
.auth-back-leave-active > * {
	min-height: 0;
}

.auth-panel-enter-from,
.auth-panel-leave-to,
.auth-back-enter-from,
.auth-back-leave-to {
	grid-template-rows: 0fr;
	opacity: 0;
	transform: translateY(-6px);
}

.auth-panel-enter-to,
.auth-panel-leave-from,
.auth-back-enter-to,
.auth-back-leave-from {
	grid-template-rows: 1fr;
	opacity: 1;
	transform: translateY(0);
}

.auth-title-enter-active,
.auth-title-leave-active {
	transition:
		opacity 240ms ease,
		transform 300ms ease;
}

.auth-title-enter-from {
	opacity: 0;
	transform: translateY(8px);
}

.auth-title-leave-to {
	opacity: 0;
	transform: translateY(-8px);
}
</style>
