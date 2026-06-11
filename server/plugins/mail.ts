import { onEvent } from '../utils/events/event-bus'
import { sendPasswordResetRequestedMail } from '../utils/mail/sender'

export default defineNitroPlugin(() => {
	onEvent('auth.password-reset.requested', async (payload) => {
		try {
			const sent = await sendPasswordResetRequestedMail({
				to: payload.email,
				displayName: payload.displayName,
				handle: payload.handle,
				locale: payload.locale,
				requestedAt: payload.requestedAt,
			})

			if (!sent) {
				console.warn(
					'[mail] SMTP runtime is not configured; password reset mail was skipped.',
				)
			}
		} catch (error) {
			console.error('[mail] Failed to send password reset mail.', error)
		}
	})
})
