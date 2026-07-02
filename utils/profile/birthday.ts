import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { Solar } from 'lunar-typescript'

/**
 * 生日展示计算工具。从 components/profile/edit/ProfileBirthdayInfo.vue 抽出，
 * 供编辑页与公开主页 /u/[username] 共用：年龄、农历、星座、生肖，以及公开页新增的
 * 距下次生日天数 / 距上次生日已过天数。
 */

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

export interface BirthdayAgeParts {
	years: number
	months: number
	days: number
}

export interface BirthdaySummary {
	age: BirthdayAgeParts
	constellationKey: string | null
	constellationRaw: string
	zodiacKey: string | null
	zodiacRaw: string
	lunar: {
		month: string
		day: string
		isLeapMonth: boolean
	} | null
	/** 距下次生日还剩多少天（含今天起算，0 表示今天就是生日）。 */
	daysUntilNextBirthday: number
	/** 距上次生日已过去多少天。今天生日则为 0。 */
	daysSinceLastBirthday: number
}

const isEnglishLocale = (locale: string) => locale === 'en-US'

export const resolveConstellationKey = (value: string): string | null => {
	const matchedKey = Object.entries(constellationKeyMap).find(([key]) =>
		value.startsWith(key),
	)?.[1]

	return matchedKey ?? null
}

export const resolveZodiacKey = (value: string): string | null =>
	zodiacKeyMap[value] ?? null

/**
 * 解析生日（ISO 字符串或 Date）为展示摘要。非法或未来日期返回 null。
 */
export const resolveBirthdaySummary = (
	value: string | Date | null | undefined,
): BirthdaySummary | null => {
	if (!value) {
		return null
	}

	const birthday = dayjs(value)
	const today = dayjs().startOf('day')

	if (!birthday.isValid() || birthday.isAfter(today)) {
		return null
	}

	const solar = Solar.fromYmd(
		birthday.year(),
		birthday.month() + 1,
		birthday.date(),
	)

	const years = today.diff(birthday, 'year')
	const afterYears = birthday.add(years, 'year')
	const months = today.diff(afterYears, 'month')
	const afterMonths = afterYears.add(months, 'month')
	const days = today.diff(afterMonths, 'day')

	const lunar = solar.getLunar()
	const lunarText = lunar.toString()
	const isLeapMonth = lunarText.includes('闰')

	const constellationRaw = solar.getXingZuo()
	const zodiacRaw = lunar.getYearShengXiao()

	const daysUntilNextBirthday = computeDaysUntilNextBirthday(birthday, today)
	const daysSinceLastBirthday = computeDaysSinceLastBirthday(birthday, today)

	return {
		age: {
			years,
			months,
			days,
		},
		constellationKey: resolveConstellationKey(constellationRaw),
		constellationRaw,
		zodiacKey: resolveZodiacKey(zodiacRaw),
		zodiacRaw,
		lunar: {
			month: lunar.getMonthInChinese(),
			day: lunar.getDayInChinese(),
			isLeapMonth,
		},
		daysUntilNextBirthday,
		daysSinceLastBirthday,
	}
}

/**
 * 计算距下一次生日（月-日）还剩多少天。
 *
 * 取今年的「生日月日」；若已过（diff < 0），则取明年的。今天就是生日返回 0。
 * 闰年 2/29 生日在非闰年会自动落到 3/1（dayjs 行为），可接受。
 */
export const computeDaysUntilNextBirthday = (
	birthday: Dayjs,
	today: Dayjs,
): number => {
	const thisYearBirthday = dayjs()
		.year(today.year())
		.month(birthday.month())
		.date(birthday.date())
	let candidate = thisYearBirthday
	const diff = thisYearBirthday.startOf('day').diff(today, 'day')

	if (diff < 0) {
		candidate = thisYearBirthday.add(1, 'year')
	}

	return candidate.startOf('day').diff(today, 'day')
}

/**
 * 计算距上一次生日已过去多少天。今天生日返回 0。
 */
export const computeDaysSinceLastBirthday = (
	birthday: Dayjs,
	today: Dayjs,
): number => {
	const thisYearBirthday = dayjs()
		.year(today.year())
		.month(birthday.month())
		.date(birthday.date())
	let candidate = thisYearBirthday

	if (thisYearBirthday.startOf('day').isAfter(today)) {
		candidate = thisYearBirthday.subtract(1, 'year')
	}

	return today.diff(candidate.startOf('day'), 'day')
}

/**
 * 把年龄拼成文案，复用 profile.edit.birthday.units.* / age 这套 i18n。
 * 由调用方传入 t 与 locale，避免 util 耦合 i18n composable。
 */
export const formatAgeParts = (
	age: BirthdayAgeParts,
	t: (key: string, params?: Record<string, unknown>) => string,
	locale: string,
): string => {
	const parts = [t('profile.edit.birthday.units.year', { count: age.years })]

	if (age.months > 0) {
		parts.push(t('profile.edit.birthday.units.month', { count: age.months }))
	}

	if (age.days > 0) {
		parts.push(t('profile.edit.birthday.units.day', { count: age.days }))
	}

	return t('profile.edit.birthday.age', {
		age: age.years,
		detail: parts.join(isEnglishLocale(locale) ? ' ' : ''),
	})
}

/**
 * 把完整摘要拼成编辑页用的单行文案（含农历/星座/生肖）。
 */
export const formatBirthdaySummaryText = (
	summary: BirthdaySummary,
	t: (key: string, params?: Record<string, unknown>) => string,
	locale: string,
): string => {
	const ageText = formatAgeParts(summary.age, t, locale)
	const constellationText = summary.constellationKey
		? t(`profile.edit.birthday.constellations.${summary.constellationKey}`)
		: summary.constellationRaw
	const zodiacText = summary.zodiacKey
		? t(`profile.edit.birthday.zodiacs.${summary.zodiacKey}`)
		: summary.zodiacRaw

	if (isEnglishLocale(locale)) {
		return t('profile.edit.birthday.summaryEn', {
			age: ageText,
			constellation: constellationText,
			zodiac: zodiacText,
		})
	}

	const lunarText = summary.lunar
		? t('profile.edit.birthday.lunar', {
				leap: summary.lunar.isLeapMonth
					? t('profile.edit.birthday.lunarLeap')
					: '',
				month: summary.lunar.month,
				day: summary.lunar.day,
			})
		: ''

	return t('profile.edit.birthday.summary', {
		age: ageText,
		lunar: lunarText,
		constellation: constellationText,
		zodiac: zodiacText,
	})
}

/** 性别符号映射：MALE → ♂，FEMALE → ♀，UNSPECIFIED → 空。 */
export const resolveGenderSymbol = (
	gender: 'UNSPECIFIED' | 'MALE' | 'FEMALE' | null | undefined,
): string => {
	if (gender === 'MALE') {
		return '♂'
	}

	if (gender === 'FEMALE') {
		return '♀'
	}

	return ''
}
