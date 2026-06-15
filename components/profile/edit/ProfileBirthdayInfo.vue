<template>
	<div
		v-if="birthdayInfoText"
		class="text-xs text-slate-500 dark:text-slate-400"
	>
		{{ birthdayInfoText }}
	</div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { Solar } from 'lunar-typescript'

interface ProfileBirthdayInfoProps {
	birthday: string
}

const props = defineProps<ProfileBirthdayInfoProps>()
const { t, locale } = useI18n()

const zodiacKeyMap: Record<string, string> = {
	鼠: 'rat',
	牛: 'ox',
	虎: 'tiger',
	兔: 'rabbit',
	龙: 'dragon',
	蛇: 'snake',
	马: 'horse',
	羊: 'goat',
	猴: 'monkey',
	鸡: 'rooster',
	狗: 'dog',
	猪: 'pig',
}

const constellationKeyMap: Record<string, string> = {
	白羊: 'aries',
	金牛: 'taurus',
	双子: 'gemini',
	巨蟹: 'cancer',
	狮子: 'leo',
	处女: 'virgo',
	天秤: 'libra',
	天蝎: 'scorpio',
	射手: 'sagittarius',
	摩羯: 'capricorn',
	水瓶: 'aquarius',
	双鱼: 'pisces',
}

const buildAgeParts = (birthday: Dayjs, today: Dayjs): string => {
	const years = today.diff(birthday, 'year')
	const afterYears = birthday.add(years, 'year')
	const months = today.diff(afterYears, 'month')
	const afterMonths = afterYears.add(months, 'month')
	const days = today.diff(afterMonths, 'day')

	const isEnglish = locale.value === 'en-US'
	const parts = [t('profile.edit.birthday.units.year', { count: years })]

	if (months > 0) {
		parts.push(t('profile.edit.birthday.units.month', { count: months }))
	}

	if (days > 0) {
		parts.push(t('profile.edit.birthday.units.day', { count: days }))
	}

	return t('profile.edit.birthday.age', {
		age: years,
		detail: parts.join(isEnglish ? ' ' : ''),
	})
}

const buildLunarText = (solar: Solar): string => {
	const lunar = solar.getLunar()
	const lunarMonth = lunar.getMonthInChinese()
	const lunarDay = lunar.getDayInChinese()
	const isLeapMonth = lunar.toString().includes('闰')

	return t('profile.edit.birthday.lunar', {
		leap: isLeapMonth ? t('profile.edit.birthday.lunarLeap') : '',
		month: lunarMonth,
		day: lunarDay,
	})
}

const getLocalizedConstellation = (value: string): string => {
	const matchedKey = Object.entries(constellationKeyMap).find(([key]) =>
		value.startsWith(key),
	)?.[1]

	return matchedKey
		? t(`profile.edit.birthday.constellations.${matchedKey}`)
		: value
}

const getLocalizedZodiac = (value: string): string => {
	const matchedKey = zodiacKeyMap[value]

	return matchedKey ? t(`profile.edit.birthday.zodiacs.${matchedKey}`) : value
}

const birthdayInfoText = computed(() => {
	if (!props.birthday) {
		return ''
	}

	const birthday = dayjs(props.birthday)
	const today = dayjs().startOf('day')

	if (!birthday.isValid() || birthday.isAfter(today)) {
		return ''
	}

	const solar = Solar.fromYmd(
		birthday.year(),
		birthday.month() + 1,
		birthday.date(),
	)
	const ageText = buildAgeParts(birthday, today)
	const constellationText = getLocalizedConstellation(solar.getXingZuo())
	const zodiacText = getLocalizedZodiac(solar.getLunar().getYearShengXiao())
	const lunarText = buildLunarText(solar)

	if (locale.value === 'en-US') {
		return t('profile.edit.birthday.summaryEn', {
			age: ageText,
			constellation: constellationText,
			zodiac: zodiacText,
		})
	}

	return t('profile.edit.birthday.summary', {
		age: ageText,
		lunar: lunarText,
		constellation: constellationText,
		zodiac: zodiacText,
	})
})
</script>
