import { useToast } from '@nuxt/ui/composables'

interface AdminToastOptions {
	title?: string
	description?: string
}

export const useAdminToast = () => {
	const toast = useToast()
	const { getErrorCode, getErrorMessage } = useApiError()

	const notifyError = (
		error: unknown,
		options: AdminToastOptions = {},
	): void => {
		const code = getErrorCode(error)
		const message = getErrorMessage(error)
		const isCaptchaError = code.startsWith('CAPTCHA_')

		toast.add({
			title: isCaptchaError ? message : (options.title ?? message),
			description: isCaptchaError
				? undefined
				: options.description
					? `${options.description} ${message}`
					: options.title
						? message
						: undefined,
			color: 'error',
			icon: 'i-lucide-circle-alert',
		})
	}

	const notifySuccess = (
		options: AdminToastOptions & { title: string },
	): void => {
		toast.add({
			title: options.title,
			description: options.description,
			color: 'success',
			icon: 'i-lucide-circle-check',
		})
	}

	return {
		notifyError,
		notifySuccess,
	}
}
