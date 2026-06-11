import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

import {
	getMailRuntimeConfig,
	isMailRuntimeConfigured,
	type MailRuntimeConfig,
} from './runtime'
import { renderPasswordResetRequestedMail } from './templates/password-reset-requested'
import { resolveMailLocale } from './types'
import type { SendMailMessage } from './types'

let transporter: Transporter | null = null
let transporterConfigKey: string | null = null

const getTransporterConfigKey = (config: MailRuntimeConfig): string =>
	[config.host, config.port, config.secure, config.user, config.from].join('|')

const getMailTransporter = (config: MailRuntimeConfig): Transporter | null => {
	if (!isMailRuntimeConfigured(config)) {
		return null
	}

	const nextConfigKey = getTransporterConfigKey(config)

	if (transporter && transporterConfigKey === nextConfigKey) {
		return transporter
	}

	transporter = nodemailer.createTransport({
		host: config.host ?? undefined,
		port: config.port ?? undefined,
		secure: config.secure,
		auth: {
			user: config.user ?? undefined,
			pass: config.pass ?? undefined,
		},
	})
	transporterConfigKey = nextConfigKey

	return transporter
}

export const sendRuntimeMail = async (
	message: SendMailMessage,
): Promise<boolean> => {
	const config = getMailRuntimeConfig()
	const activeTransporter = getMailTransporter(config)

	if (!activeTransporter) {
		return false
	}

	await activeTransporter.sendMail({
		from: config.from,
		to: message.to,
		replyTo: config.replyTo ?? undefined,
		subject: message.subject,
		text: message.text,
		html: message.html,
	})

	return true
}

export interface SendPasswordResetRequestedMailInput {
	to: string
	displayName: string | null
	handle: string
	locale: string | null
	requestedAt: Date
}

export const sendPasswordResetRequestedMail = async (
	input: SendPasswordResetRequestedMailInput,
): Promise<boolean> => {
	const config = getMailRuntimeConfig()
	const template = renderPasswordResetRequestedMail({
		locale: resolveMailLocale(input.locale),
		displayName: input.displayName,
		handle: input.handle,
		siteUrl: config.siteUrl,
		requestedAt: input.requestedAt,
	})

	return await sendRuntimeMail({
		to: input.to,
		subject: template.subject,
		html: template.html,
		text: template.text,
	})
}
