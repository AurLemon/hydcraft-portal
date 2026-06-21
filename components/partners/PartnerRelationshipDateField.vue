<template>
	<div class="grid grid-cols-[1.4fr_1fr_1fr] gap-2" @focusout="handleFocusOut">
		<UInput
			v-model="dateParts.year"
			class="w-full text-sm"
			inputmode="numeric"
			maxlength="4"
			:placeholder="t('profile.dateParts.year')"
			@update:model-value="syncDate"
		/>
		<UInput
			v-model="dateParts.month"
			class="w-full text-sm"
			inputmode="numeric"
			maxlength="2"
			:placeholder="t('profile.dateParts.month')"
			@update:model-value="syncDate"
		/>
		<UInput
			v-model="dateParts.day"
			class="w-full text-sm"
			inputmode="numeric"
			maxlength="2"
			:placeholder="t('profile.dateParts.day')"
			@update:model-value="syncDate"
		/>
	</div>
</template>

<script setup lang="ts">
interface DateParts {
	year: string
	month: string
	day: string
}

interface ResolvedDateParts {
	year: string
	month: string
	day: string
}

const modelValue = defineModel<string>({ required: true })
const { t } = useI18n()
const dateParts = reactive<DateParts>({
	year: '',
	month: '',
	day: '',
})

const normalizeNumericPart = (value: string, maxLength: number): string =>
	value.replace(/\D/g, '').slice(0, maxLength)

const isValidDateParts = (
	year: string,
	month: string,
	day: string,
): boolean => {
	const yearNumber = Number(year)
	const monthNumber = Number(month)
	const dayNumber = Number(day)

	if (
		!Number.isInteger(yearNumber) ||
		!Number.isInteger(monthNumber) ||
		!Number.isInteger(dayNumber) ||
		yearNumber < 1900 ||
		monthNumber < 1 ||
		monthNumber > 12 ||
		dayNumber < 1 ||
		dayNumber > 31
	) {
		return false
	}

	const date = new Date(Date.UTC(yearNumber, monthNumber - 1, dayNumber))

	return (
		date.getUTCFullYear() === yearNumber &&
		date.getUTCMonth() === monthNumber - 1 &&
		date.getUTCDate() === dayNumber
	)
}

const assignDateParts = (value: string): void => {
	const matched = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
	const [, year = '', month = '', day = ''] = matched ?? []

	if (!matched || !isValidDateParts(year, month, day)) {
		dateParts.year = ''
		dateParts.month = ''
		dateParts.day = ''
		return
	}

	dateParts.year = year
	dateParts.month = month
	dateParts.day = day
}

const buildNormalizedDate = (): string | null => {
	if (!dateParts.year && !dateParts.month && !dateParts.day) {
		return ''
	}

	if (dateParts.year.length !== 4 || !dateParts.month || !dateParts.day) {
		return null
	}

	if (!isValidDateParts(dateParts.year, dateParts.month, dateParts.day)) {
		return null
	}

	return `${dateParts.year}-${dateParts.month}-${dateParts.day}`
}

const resolveCommittedDateParts = (): ResolvedDateParts | null => {
	if (!dateParts.year && !dateParts.month && !dateParts.day) {
		return null
	}

	if (dateParts.year.length !== 4 || !dateParts.month || !dateParts.day) {
		return null
	}

	const monthNumber = Number(dateParts.month)
	const dayNumber = Number(dateParts.day)
	const resolvedMonth =
		Number.isInteger(monthNumber) && monthNumber >= 1 && monthNumber <= 12
			? monthNumber
			: 1
	let resolvedDay =
		Number.isInteger(dayNumber) && dayNumber >= 1 && dayNumber <= 31
			? dayNumber
			: 1

	if (
		!isValidDateParts(
			dateParts.year,
			String(resolvedMonth),
			String(resolvedDay),
		)
	) {
		resolvedDay = 1
	}

	return {
		year: dateParts.year,
		month: String(resolvedMonth).padStart(2, '0'),
		day: String(resolvedDay).padStart(2, '0'),
	}
}

const buildCommittedDate = (): string | null => {
	const resolvedParts = resolveCommittedDateParts()

	if (!resolvedParts) {
		return null
	}

	return `${resolvedParts.year}-${resolvedParts.month}-${resolvedParts.day}`
}

const syncDate = (): void => {
	dateParts.year = normalizeNumericPart(dateParts.year, 4)
	dateParts.month = normalizeNumericPart(dateParts.month, 2)
	dateParts.day = normalizeNumericPart(dateParts.day, 2)

	const normalizedDate = buildNormalizedDate()

	if (normalizedDate === null) {
		return
	}

	modelValue.value = normalizedDate
}

const normalizeDisplayParts = (): void => {
	if (!dateParts.year && !dateParts.month && !dateParts.day) {
		modelValue.value = ''
		return
	}

	const normalizedDate = buildCommittedDate()

	if (normalizedDate === null) {
		dateParts.year = ''
		dateParts.month = ''
		dateParts.day = ''
		modelValue.value = ''
		return
	}

	modelValue.value = normalizedDate

	const [, year = '', month = '', day = ''] =
		normalizedDate.match(/^(\d{4})-(\d{2})-(\d{2})$/) ?? []

	dateParts.year = year
	dateParts.month = month
	dateParts.day = day
}

const handleFocusOut = (event: FocusEvent): void => {
	const currentTarget = event.currentTarget as HTMLElement | null
	const relatedTarget = event.relatedTarget as Node | null

	if (currentTarget?.contains(relatedTarget)) {
		return
	}

	normalizeDisplayParts()
}

watch(
	modelValue,
	(value) => {
		if (value === `${dateParts.year}-${dateParts.month}-${dateParts.day}`) {
			return
		}

		assignDateParts(value)
	},
	{ immediate: true },
)
</script>
