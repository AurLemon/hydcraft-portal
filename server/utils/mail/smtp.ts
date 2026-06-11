import nodemailer from 'nodemailer'
import type SMTPTransport from 'nodemailer/lib/smtp-transport'
import { createApiError } from '../errors'
import { getMailRuntimeConfig, isMailRuntimeConfigured } from './runtime'

interface SendMailOptions {
	to: string
	subject: string
	text: string
	html: string
}

let transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null =
	null

const getTransporter =
	(): nodemailer.Transporter<SMTPTransport.SentMessageInfo> => {
		if (transporter) {
			return transporter
		}

		const config = getMailRuntimeConfig()

		if (!isMailRuntimeConfigured(config)) {
			throw createApiError({
				statusCode: 503,
				code: 'MAIL_SERVICE_NOT_CONFIGURED',
			})
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

		return transporter
	}

export const sendMail = async (options: SendMailOptions): Promise<void> => {
	const config = getMailRuntimeConfig()

	await getTransporter().sendMail({
		from: config.from,
		to: options.to,
		replyTo: config.replyTo ?? undefined,
		subject: options.subject,
		text: options.text,
		html: options.html,
	})
}
