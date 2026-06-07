import { useToast } from '@nuxt/ui/composables'

interface AdminToastOptions {
	title?: string
	description?: string
}

const resolveErrorMessage = (error: unknown): string => {
	if (error instanceof Error) {
		return error.message
	}

	if (typeof error === 'object' && error && 'data' in error) {
		const data = error.data as { message?: unknown; statusMessage?: unknown }
		const message = data.message ?? data.statusMessage

		if (message) {
			return String(message)
		}
	}

	if (typeof error === 'object' && error && 'statusMessage' in error) {
		return String(error.statusMessage)
	}

	return '操作失败，请稍后重试'
}

export const useAdminToast = () => {
	const toast = useToast()

	const notifyError = (
		error: unknown,
		options: AdminToastOptions = {},
	): void => {
		const message = resolveErrorMessage(error)

		toast.add({
			title: options.title ?? '操作失败',
			description: options.description
				? `${options.description} ${message}`
				: message,
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
