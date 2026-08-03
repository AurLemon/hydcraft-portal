interface TurnstileWidgetRef {
	reset: () => void
}

interface UseTurnstileState {
	token: Ref<string>
	required: Ref<boolean>
	widgetRef: Ref<TurnstileWidgetRef | null>
}

export const useTurnstile = (
	requiredByDefault = false,
): UseTurnstileState & {
	markRequired: () => void
	reset: (keepRequired?: boolean) => void
	consumeToken: () => string
} => {
	const token = ref('')
	const required = ref(requiredByDefault)
	const widgetRef = ref<TurnstileWidgetRef | null>(null)

	const reset = (keepRequired = required.value): void => {
		token.value = ''
		required.value = keepRequired
		widgetRef.value?.reset()
	}

	const consumeToken = (): string => {
		const currentToken = token.value
		token.value = ''
		return currentToken
	}

	return {
		token,
		required,
		widgetRef,
		markRequired: () => {
			required.value = true
		},
		reset,
		consumeToken,
	}
}
