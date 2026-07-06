import { onEvent } from '../utils/events/event-bus'
import { sendPasswordResetRequestedMail } from '../utils/mail/sender'

export default defineNitroPlugin(() => {
	onEvent('auth.password-reset.code-requested', async (payload) => {
		try {
			const sent = await sendPasswordResetRequestedMail({
				to: payload.email,
				displayName: payload.displayName,
				handle: payload.handle,
				locale: payload.locale,
				code: payload.code,
				ipAddress: payload.ipAddress,
				ipLocation: payload.ipLocation,
				requestedAt: payload.requestedAt,
			})

			if (!sent) {
				console.warn(
					'[PASSWORD_RESET_MAIL_SKIPPED] SMTP runtime is not configured.',
				)
			}
		} catch (error) {
			console.error(
				'[PASSWORD_RESET_MAIL_FAILED] Failed to send password reset mail.',
				error,
			)
		}
	})
})
