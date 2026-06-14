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
			<Transition
				name="auth-panel"
				mode="out-in"
				@before-enter="beforeEnter"
				@enter="enter"
				@after-enter="afterEnter"
				@before-leave="beforeLeave"
				@leave="leave"
			>
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
							:disabled="resendCountdown > 0 || submitting"
							@click="resendCode"
						>
							{{ resendLabel }}
						</UButton>
					</div>
				</div>
			</Transition>

			<UButton
				type="submit"
				:icon="step === 'code' ? 'i-lucide-user-plus' : 'i-lucide-mail'"
				:loading="submitting"
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
const loginRoute = computed(() => ({
	path: localePath('/login'),
	query: route.query.redirect ? { redirect: route.query.redirect } : {},
}))

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
	step.value = 'details'
}

const getRedirectPath = (): string => {
	return normalizePortalRedirectPath(route.query.redirect, {
		fallbackPath: localePath('/me/profile'),
		loginPath: localePath('/login'),
	})
}

const submit = async (): Promise<void> => {
	if (step.value === 'details') {
		await sendRegisterCode()
		return
	}

	await confirmRegister()
}

const sendRegisterCode = async (): Promise<void> => {
	if (!form.handle || !normalizedEmail.value || !form.password) {
		return
	}

	submitting.value = true

	try {
		await requestEmailCodeLogin({
			email: normalizedEmail.value,
			intent: 'REGISTER',
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

	await sendRegisterCode()
}

const confirmRegister = async (): Promise<void> => {
	if (!form.handle || !normalizedEmail.value || !form.password || !form.code) {
		return
	}

	submitting.value = true

	try {
		await register({
			handle: form.handle,
			email: normalizedEmail.value,
			password: form.password,
			code: form.code,
		})
		notifySuccess({
			title: t('register.notifications.successTitle'),
			description: t('register.notifications.successDescription'),
		})
		await navigateTo(getRedirectPath())
	} catch (error) {
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

const beforeEnter = (element: Element): void => {
	const htmlElement = element as HTMLElement
	htmlElement.style.height = '0'
	htmlElement.style.opacity = '0'
}

const enter = (element: Element, done: () => void): void => {
	const htmlElement = element as HTMLElement
	htmlElement.style.height = `${htmlElement.scrollHeight}px`
	htmlElement.style.opacity = '1'
	window.setTimeout(done, 240)
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
	window.setTimeout(done, 240)
}
</script>

<style scoped>
.auth-panel-enter-active,
.auth-panel-leave-active,
.auth-back-enter-active,
.auth-back-leave-active {
	transition:
		height 240ms ease,
		opacity 180ms ease;
}

.auth-title-enter-active,
.auth-title-leave-active {
	transition:
		opacity 180ms ease,
		transform 220ms ease;
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
