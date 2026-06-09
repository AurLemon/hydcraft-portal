<template>
	<div class="grid grid-cols-[1.4fr_1fr_1fr] gap-2">
		<UInput
			v-model="dateParts.year"
			class="w-full text-sm"
			inputmode="numeric"
			maxlength="4"
			:placeholder="t('profile.dateParts.year')"
			@update:model-value="syncBirthday"
		/>
		<UInput
			v-model="dateParts.month"
			class="w-full text-sm"
			inputmode="numeric"
			maxlength="2"
			:placeholder="t('profile.dateParts.month')"
			@update:model-value="syncBirthday"
		/>
		<UInput
			v-model="dateParts.day"
			class="w-full text-sm"
			inputmode="numeric"
			maxlength="2"
			:placeholder="t('profile.dateParts.day')"
			@update:model-value="syncBirthday"
		/>
	</div>
</template>

<script setup lang="ts">
interface BirthdayDateParts {
	year: string
	month: string
	day: string
}

const birthday = defineModel<string>({ required: true })
const { t } = useI18n()
const dateParts = reactive<BirthdayDateParts>({
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
	const matched = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
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

const syncBirthday = (): void => {
	dateParts.year = normalizeNumericPart(dateParts.year, 4)
	dateParts.month = normalizeNumericPart(dateParts.month, 2)
	dateParts.day = normalizeNumericPart(dateParts.day, 2)

	if (!dateParts.year && !dateParts.month && !dateParts.day) {
		birthday.value = ''
		return
	}

	if (dateParts.year.length !== 4 || !dateParts.month || !dateParts.day) {
		return
	}

	const normalizedMonth = dateParts.month.padStart(2, '0')
	const normalizedDay = dateParts.day.padStart(2, '0')
	const nextBirthday = `${dateParts.year}-${normalizedMonth}-${normalizedDay}`

	if (!isValidDateParts(dateParts.year, normalizedMonth, normalizedDay)) {
		return
	}

	birthday.value = nextBirthday
	dateParts.month = normalizedMonth
	dateParts.day = normalizedDay
}

watch(
	birthday,
	(value) => {
		if (value === `${dateParts.year}-${dateParts.month}-${dateParts.day}`) {
			return
		}

		assignDateParts(value)
	},
	{ immediate: true },
)
</script>
