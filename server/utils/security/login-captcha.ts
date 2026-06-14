import type { H3Event } from 'h3'
import { SecurityEventType } from '~/generated/prisma/client'
import { prisma } from '../db/prisma'
import { getClientIpAddress } from '../ip-location/ip-normalizer'
import { recordSecurityEvent } from './security-events'

const LOGIN_CAPTCHA_THRESHOLD = 3
const LOGIN_CAPTCHA_WINDOW_MS = 15 * 60 * 1000

export const shouldRequireLoginCaptcha = async (
	event: H3Event,
	userId: string,
): Promise<boolean> => {
	const ipAddress = getClientIpAddress(event)

	if (!ipAddress) {
		return false
	}

	const failedCount = await prisma.securityEvent.count({
		where: {
			userId,
			type: SecurityEventType.LOGIN_FAILED,
			ipAddress,
			createdAt: {
				gte: new Date(Date.now() - LOGIN_CAPTCHA_WINDOW_MS),
			},
		},
	})

	return failedCount >= LOGIN_CAPTCHA_THRESHOLD
}

export const recordLoginFailure = async (
	event: H3Event,
	userId: string,
	login: string,
): Promise<void> => {
	await recordSecurityEvent({
		event,
		userId,
		type: 'LOGIN_FAILED',
		title: '登录失败',
		description: login,
	})
}
