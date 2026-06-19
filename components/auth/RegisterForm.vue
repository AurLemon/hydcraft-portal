<template>
	<div class="space-y-5">
		<Transition name="auth-back">
			<div v-if="showBackButton" class="auth-back-wrap">
				<button
					type="button"
					class="inline-flex w-fit items-center gap-2 text-sm font-medium text-sky-600 transition hover:text-sky-500 dark:text-sky-300 dark:hover:text-sky-200"
					@click="goBack"
				>
					<UIcon name="i-lucide-arrow-left" class="size-4" />
					{{ t(backActionKey) }}
				</button>
			</div>
		</Transition>

		<div>
			<Transition name="auth-title" mode="out-in">
				<div :key="`${mode}-${step}`">
					<h1
						class="text-2xl font-semibold tracking-normal text-slate-950 dark:text-white"
					>
						{{ t(titleKey) }}
					</h1>
					<p class="text-sm leading-6 text-slate-600 dark:text-slate-300/80">
						{{ t(descriptionKey) }}
					</p>
				</div>
			</Transition>
		</div>

		<Transition name="auth-panel" mode="out-in">
			<form
				v-if="mode === 'game' && step === 'auth'"
				key="game-auth"
				class="space-y-5 overflow-hidden"
				@submit.prevent="submit"
			>
				<div class="space-y-4">
					<label
						class="flex flex-col gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-100"
					>
						<span>{{ t('minecraftRegister.fields.username') }}</span>
						<UInput
							v-model="form.gameUsername"
							required
							autocomplete="username"
							size="lg"
							variant="outline"
						/>
					</label>
					<label
						class="flex flex-col gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-100"
					>
						<span>{{ t('minecraftRegister.fields.password') }}</span>
						<UInput
							v-model="form.gamePassword"
							:type="gamePasswordVisible ? 'text' : 'password'"
							required
							autocomplete="current-password"
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
										gamePasswordVisible ? 'i-lucide-eye-off' : 'i-lucide-eye'
									"
									:aria-label="t('auth.actions.togglePassword')"
									@click="gamePasswordVisible = !gamePasswordVisible"
								/>
							</template>
						</UInput>
					</label>
				</div>

				<UButton
					type="submit"
					:icon="submitIcon"
					:loading="submitting"
					:disabled="submitDisabled"
					size="lg"
					class="w-full justify-center"
				>
					{{ t(submitLabelKey) }}
				</UButton>
			</form>

			<form
				v-else-if="step === 'details'"
				:key="`${mode}-details`"
				class="space-y-5 overflow-hidden"
				@submit.prevent="submit"
			>
				<div class="space-y-4">
					<div
						v-if="ticketPreview && ticketPreview.kind === 'GAME_ACCOUNT'"
						class="flex items-start gap-3 text-sm"
					>
						<div
							class="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"
						>
							<UIcon name="i-lucide-check" class="size-3" />
						</div>
						<div class="min-w-0 flex-1">
							<p
								class="flex min-w-0 items-center gap-2 font-medium text-slate-900 dark:text-white"
							>
								<span class="shrink-0">{{ ticketHeadlinePrefix }}</span>
								<SkeletonImage
									v-if="ticketMinecraftHeadUrl"
									:src="ticketMinecraftHeadUrl"
									:alt="ticketAccountName"
									class="size-5 shrink-0"
									skeleton-class="rounded-md"
									image-class="size-5 rounded-md object-cover"
								/>
								<span class="min-w-0 truncate">{{ ticketAccountName }}</span>
							</p>
							<p
								v-if="ticketMinecraftMetaLine"
								class="mt-1 text-slate-600 dark:text-slate-300/80"
							>
								{{ ticketMinecraftMetaLine }}
							</p>
						</div>
					</div>

					<div v-else-if="ticketPreview" class="flex items-start gap-3 text-sm">
						<div
							class="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"
						>
							<UIcon name="i-lucide-check" class="size-3" />
						</div>
						<div class="min-w-0 flex-1">
							<p
								class="min-w-0 truncate font-medium text-slate-900 dark:text-white"
							>
								{{ ticketHeadline }}
							</p>
						</div>
					</div>

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
						v-if="mode === 'email'"
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
									:icon="passwordVisible ? 'i-lucide-eye-off' : 'i-lucide-eye'"
									:aria-label="t('auth.actions.togglePassword')"
									@click="passwordVisible = !passwordVisible"
								/>
							</template>
						</UInput>
					</label>

					<CapWidget ref="captchaWidgetRef" v-model="captcha.token.value" />
				</div>

				<UButton
					type="submit"
					:icon="submitIcon"
					:loading="submitting"
					:disabled="submitDisabled"
					size="lg"
					class="w-full justify-center"
				>
					{{ t(submitLabelKey) }}
				</UButton>

				<div
					v-if="showEmailAuxiliary"
					class="space-y-2 text-center text-sm text-slate-600 dark:text-slate-300/80"
				>
					<p>
						{{ t('register.loginPrompt.text') }}
						<NuxtLink
							:to="loginRoute"
							class="font-medium text-sky-600 transition hover:text-sky-500 dark:text-sky-300 dark:hover:text-sky-200"
						>
							{{ t('register.loginPrompt.action') }}
						</NuxtLink>
					</p>
					<p>
						{{ t('register.minecraftPrompt.text') }}
						<NuxtLink
							:to="gameRegisterRoute"
							class="font-medium text-sky-600 transition hover:text-sky-500 dark:text-sky-300 dark:hover:text-sky-200"
						>
							{{ t('register.minecraftPrompt.action') }}
						</NuxtLink>
					</p>
				</div>

				<AuthProviderList v-if="showEmailAuxiliary" />
			</form>

			<form
				v-else
				:key="`${mode}-code`"
				class="space-y-5 overflow-hidden"
				@submit.prevent="submit"
			>
				<div class="space-y-3">
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
						:disabled="resendDisabled"
						@click="resendCode"
					>
						{{ resendLabel }}
					</UButton>
					<CapWidget
						v-if="showCodeStepCaptcha"
						ref="captchaWidgetRef"
						v-model="captcha.token.value"
					/>
				</div>

				<UButton
					type="submit"
					:icon="submitIcon"
					:loading="submitting"
					:disabled="submitDisabled"
					size="lg"
					class="w-full justify-center"
				>
					{{ t(submitLabelKey) }}
				</UButton>

				<div
					v-if="showEmailAuxiliary"
					class="space-y-2 text-center text-sm text-slate-600 dark:text-slate-300/80"
				>
					<p>
						{{ t('register.loginPrompt.text') }}
						<NuxtLink
							:to="loginRoute"
							class="font-medium text-sky-600 transition hover:text-sky-500 dark:text-sky-300 dark:hover:text-sky-200"
						>
							{{ t('register.loginPrompt.action') }}
						</NuxtLink>
					</p>
					<p>
						{{ t('register.minecraftPrompt.text') }}
						<NuxtLink
							:to="gameRegisterRoute"
							class="font-medium text-sky-600 transition hover:text-sky-500 dark:text-sky-300 dark:hover:text-sky-200"
						>
							{{ t('register.minecraftPrompt.action') }}
						</NuxtLink>
					</p>
				</div>

				<AuthProviderList v-if="showEmailAuxiliary" />
			</form>
		</Transition>
	</div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import SkeletonImage from '~/components/common/SkeletonImage.vue'
import type {
	PortalIpLocationSummary,
	PortalRegistrationTicketSummary,
} from '~/composables/usePortalAuth'
import { normalizePortalRedirectPath } from '~/utils/auth/redirect'
import { getMinecraftHeadRendererUrl } from '~/utils/minecraft/body-renderer'

interface RegisterFormState {
	gameUsername: string
	gamePassword: string
	handle: string
	email: string
	password: string
	code: string
}

type RegisterMode = 'email' | 'game' | 'oauth'
type RegisterStep = 'auth' | 'details' | 'code'
type GameRegistrationTicketPreview = Extract<
	PortalRegistrationTicketSummary,
	{ kind: 'GAME_ACCOUNT' }
>

const parseRegisterMode = (value: unknown): RegisterMode =>
	value === 'game' || value === 'oauth' ? value : 'email'

const route = useRoute()
const localePath = useLocalePath()
const { locale, t } = useI18n()
const {
	register,
	requestEmailCodeLogin,
	requestMinecraftRegisterTicket,
	getRegistrationTicket,
	completeRegistrationWithTicket,
	checkUsernameAvailability,
} = usePortalAuth()
const { notifyError, notifySuccess } = useAdminToast()
const { getErrorCode } = useApiError()
const submitting = ref(false)
const passwordVisible = ref(false)
const gamePasswordVisible = ref(false)
const mode = ref<RegisterMode>(parseRegisterMode(route.query.mode))
const step = ref<RegisterStep>(mode.value === 'game' ? 'auth' : 'details')
const resendCountdown = ref(0)
const ticketToken = ref('')
const ticketPreview = ref<PortalRegistrationTicketSummary | null>(null)
const checkedHandle = ref('')
let resendTimer: number | null = null
const captcha = useCap(true)
const captchaWidgetRef = ref<{ reset: () => void } | null>(null)
const form = reactive<RegisterFormState>({
	gameUsername: '',
	gamePassword: '',
	handle: '',
	email: '',
	password: '',
	code: '',
})

const normalizedEmail = computed(() => form.email.trim())
const normalizedHandle = computed(() => form.handle.trim())
const showBackButton = computed(
	() => step.value === 'code' || mode.value !== 'email',
)
const titleKey = computed(() => {
	if (mode.value === 'game' && step.value === 'auth') {
		return 'minecraftRegister.title'
	}

	if (mode.value === 'oauth') {
		return 'oauthRegister.title'
	}

	return 'register.title'
})
const descriptionKey = computed(() => {
	if (mode.value === 'game' && step.value === 'auth') {
		return 'minecraftRegister.description'
	}

	if (mode.value === 'oauth') {
		return 'oauthRegister.description'
	}

	if (mode.value === 'game') {
		return 'minecraftRegister.detailsDescription'
	}

	return 'register.description'
})
const backActionKey = computed(() => 'register.actions.back')
const submitLabelKey = computed(() => {
	if (mode.value === 'game' && step.value === 'auth') {
		return 'minecraftRegister.actions.verify'
	}

	if (step.value === 'code') {
		return mode.value === 'email'
			? 'register.actions.submit'
			: 'register.actions.completeWithTicket'
	}

	return 'register.actions.sendCode'
})
const submitIcon = computed(() => {
	if (mode.value === 'game' && step.value === 'auth') {
		return 'i-lucide-shield-check'
	}

	return step.value === 'code' ? 'i-lucide-user-plus' : 'i-lucide-mail'
})
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
const gameRegisterRoute = computed(() => ({
	path: localePath('/register'),
	query: {
		...(route.query.redirect ? { redirect: route.query.redirect } : {}),
		mode: 'game',
	},
}))
const showEmailAuxiliary = computed(
	() => mode.value === 'email' && step.value === 'details',
)
const showCodeStepCaptcha = computed(() => {
	if (step.value !== 'code') {
		return false
	}

	return resendCountdown.value <= 0
})
const submitDisabled = computed(() => {
	if (mode.value === 'game' && step.value === 'auth') {
		return !form.gameUsername || !form.gamePassword || submitting.value
	}

	if (step.value === 'details') {
		if (mode.value === 'email') {
			return (
				!form.handle ||
				!normalizedEmail.value ||
				!form.password ||
				!captcha.token.value ||
				submitting.value
			)
		}

		return (
			!form.handle ||
			!normalizedEmail.value ||
			!captcha.token.value ||
			submitting.value
		)
	}

	if (mode.value === 'email') {
		return (
			!form.handle ||
			!normalizedEmail.value ||
			!form.password ||
			!form.code ||
			submitting.value
		)
	}

	return (
		!form.handle || !normalizedEmail.value || !form.code || submitting.value
	)
})
const resendDisabled = computed(() => {
	if (resendCountdown.value > 0 || submitting.value || !normalizedEmail.value) {
		return true
	}

	if (showCodeStepCaptcha.value && !captcha.token.value) {
		return true
	}

	return false
})
const ticketHeadline = computed(() => {
	if (!ticketPreview.value) {
		return ''
	}

	if (ticketPreview.value.kind === 'GAME_ACCOUNT') {
		return t('minecraftRegister.ticket.headline', {
			name:
				ticketPreview.value.account?.displayName ||
				ticketPreview.value.account?.username ||
				'Unknown',
		})
	}

	return t('oauthRegister.ticket.headline', {
		username:
			ticketPreview.value.oauth.providerUsername ||
			ticketPreview.value.oauth.provider ||
			'OAuth',
	})
})
const ticketHeadlinePrefix = computed(() => {
	if (!ticketPreview.value || ticketPreview.value.kind !== 'GAME_ACCOUNT') {
		return ''
	}

	return t('minecraftRegister.ticket.headlinePrefix')
})
const ticketAccountName = computed(() => {
	if (!ticketPreview.value || ticketPreview.value.kind !== 'GAME_ACCOUNT') {
		return ''
	}

	return (
		ticketPreview.value.account?.displayName ||
		ticketPreview.value.account?.username ||
		'Unknown'
	)
})
const ticketMinecraftHeadUrl = computed(() => {
	if (!ticketPreview.value || ticketPreview.value.kind !== 'GAME_ACCOUNT') {
		return null
	}

	const name =
		ticketPreview.value.account?.username ||
		ticketPreview.value.account?.displayName ||
		null

	return name ? getMinecraftHeadRendererUrl(name) : null
})
const formatTicketDateTime = (value: string | null): string | null => {
	if (!value) {
		return null
	}

	return locale.value === 'zh-CN'
		? dayjs(value).format('YYYY 年 M 月 D 日 HH:mm:ss')
		: dayjs(value).format('YYYY-MM-DD HH:mm:ss')
}

const getIpLocationDisplay = (
	ipLocation: PortalIpLocationSummary | null | undefined,
): string =>
	ipLocation?.display ?? t('minecraftRegister.ticket.unknownLocation')

const ticketMinecraftMetaLine = computed(() => {
	if (!ticketPreview.value || ticketPreview.value.kind !== 'GAME_ACCOUNT') {
		return ''
	}

	const account = ticketPreview.value.account
	if (!account) {
		return ''
	}

	return t('minecraftRegister.ticket.activityLine', {
		lastLoginAt:
			formatTicketDateTime(account.lastLoginAt) ??
			t('minecraftRegister.ticket.unknownDateTime'),
		lastLoginLocation: getIpLocationDisplay(account.lastIpLocation),
		registeredAt:
			formatTicketDateTime(account.registeredAt) ??
			t('minecraftRegister.ticket.unknownDateTime'),
		registerLocation: getIpLocationDisplay(account.registerIpLocation),
	})
})

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

const resetCaptcha = (): void => {
	captcha.reset(true)
	captchaWidgetRef.value?.reset()
}

const syncModeFromRoute = async (): Promise<void> => {
	const nextMode = parseRegisterMode(route.query.mode)
	const nextTicketToken = String(route.query.ticket ?? '').trim()

	mode.value = nextMode

	if (!nextTicketToken) {
		ticketToken.value = ''
		ticketPreview.value = null
		step.value = mode.value === 'game' ? 'auth' : 'details'
		return
	}

	ticketToken.value = nextTicketToken
	step.value = 'details'

	try {
		const ticket = await getRegistrationTicket(nextTicketToken)
		ticketPreview.value = ticket
		mode.value = ticket.kind === 'GAME_ACCOUNT' ? 'game' : 'oauth'

		if (
			ticket.kind === 'OAUTH' &&
			!form.email &&
			ticket.oauth.providerEmail?.trim()
		) {
			form.email = ticket.oauth.providerEmail
		}
	} catch (error) {
		ticketToken.value = ''
		notifyError(error)
	}
}

const applyLocalGameTicketPreview = (
	registrationToken: string,
	account: GameRegistrationTicketPreview['account'],
): void => {
	ticketToken.value = registrationToken
	ticketPreview.value = {
		kind: 'GAME_ACCOUNT',
		token: registrationToken,
		expiresAt: '',
		account,
	}
	mode.value = 'game'
	step.value = 'details'
}

watch(
	() => [route.query.mode, route.query.ticket] as const,
	async () => {
		await syncModeFromRoute()
	},
	{
		immediate: true,
	},
)

const getRedirectPath = (): string => {
	return normalizePortalRedirectPath(route.query.redirect, {
		fallbackPath: localePath('/me/profile'),
		loginPath: localePath('/login'),
	})
}

const goBack = async (): Promise<void> => {
	if (step.value === 'code') {
		resetCodeStep()
		return
	}

	await navigateTo({
		path: localePath('/register'),
		query: route.query.redirect ? { redirect: route.query.redirect } : {},
	})
}

const resetCodeStep = (): void => {
	form.code = ''
	stopResendCountdown()
	resetCaptcha()
	step.value = 'details'
}

watch(
	() => normalizedHandle.value,
	(value, previousValue) => {
		if (value !== previousValue) {
			checkedHandle.value = ''
		}
	},
)

const submit = async (): Promise<void> => {
	if (submitDisabled.value) {
		return
	}

	if (mode.value === 'game' && step.value === 'auth') {
		await verifyMinecraftAccount()
		return
	}

	if (step.value === 'details') {
		await sendRegisterCode()
		return
	}

	await confirmRegister()
}

const verifyMinecraftAccount = async (): Promise<void> => {
	submitting.value = true

	try {
		const response = await requestMinecraftRegisterTicket({
			username: form.gameUsername,
			password: form.gamePassword,
		})
		resetCaptcha()
		applyLocalGameTicketPreview(response.registrationToken, response.account)
		void navigateTo({
			path: localePath('/register'),
			query: {
				...(route.query.redirect ? { redirect: route.query.redirect } : {}),
				mode: 'game',
				ticket: response.registrationToken,
			},
		})
		notifySuccess({
			title: t('minecraftRegister.notifications.verifiedTitle'),
			description: t('minecraftRegister.notifications.verifiedDescription'),
		})
	} catch (error) {
		resetCaptcha()
		notifyError(error, {
			title: t('minecraftRegister.notifications.failedTitle'),
			description: t('minecraftRegister.notifications.failedDescription'),
		})
	} finally {
		submitting.value = false
	}
}

const sendRegisterCode = async (): Promise<void> => {
	if (
		!normalizedHandle.value ||
		!normalizedEmail.value ||
		(mode.value === 'email' && !form.password) ||
		!captcha.token.value ||
		submitting.value
	) {
		return
	}

	submitting.value = true

	try {
		const availability = await checkUsernameAvailability(normalizedHandle.value)

		if (!availability.available) {
			checkedHandle.value = ''
			throw createError({
				statusCode: 409,
				statusMessage: 'USERNAME_TAKEN',
				data: {
					code: 'USERNAME_TAKEN',
				},
			})
		}

		await requestEmailCodeLogin({
			email: normalizedEmail.value,
			intent: 'REGISTER',
			locale: locale.value,
			captchaToken: captcha.consumeToken(),
		})
		checkedHandle.value = availability.username
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
	if (resendDisabled.value) {
		return
	}

	await sendRegisterCode()
}

const confirmRegister = async (): Promise<void> => {
	if (
		!normalizedHandle.value ||
		!normalizedEmail.value ||
		!form.code ||
		submitting.value
	) {
		return
	}

	if (mode.value === 'email' && !form.password) {
		return
	}

	submitting.value = true

	try {
		if (checkedHandle.value !== normalizedHandle.value) {
			throw createError({
				statusCode: 409,
				statusMessage: 'USERNAME_TAKEN',
				data: {
					code: 'USERNAME_TAKEN',
				},
			})
		}

		if (mode.value === 'email') {
			await register({
				handle: form.handle,
				email: normalizedEmail.value,
				password: form.password,
				code: form.code,
			})
		} else if (ticketToken.value) {
			await completeRegistrationWithTicket({
				ticketToken: ticketToken.value,
				handle: form.handle,
				email: normalizedEmail.value,
				...(form.code ? { code: form.code } : {}),
			})
		}

		notifySuccess({
			title:
				mode.value === 'email'
					? t('register.notifications.successTitle')
					: t('register.notifications.ticketSuccessTitle'),
			description:
				mode.value === 'email'
					? t('register.notifications.successDescription')
					: t('register.notifications.ticketSuccessDescription'),
		})
		await navigateTo(getRedirectPath())
	} catch (error) {
		if (getErrorCode(error) === 'USERNAME_TAKEN') {
			step.value = 'details'
			form.code = ''
		}

		if (mode.value === 'email' || step.value === 'details') {
			resetCaptcha()
		}

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
