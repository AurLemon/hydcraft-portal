import { renderMailLayout } from './template-layout'
import type {
	MailLocale,
	MailTemplateRenderResult,
	VerificationMailInput,
} from './types'

interface VerificationMailCopy {
	subject: string
	preheader: string
	title: string
	lead: (name: string, operation: string) => string
	codeLabel: string
	expires: string
	ipPrefix: string
	warning: string
	footerNote: string
	systemFooter: string
	textIntro: (name: string, operation: string) => string
}

const userProfileLanguageToMailLocale: Record<string, MailLocale> = {
	ZH_CN: 'zh-CN',
	ZH_TW: 'zh-TW',
	EN_US: 'en-US',
	JA_JP: 'ja-JP',
}

const copyByLocale: Record<MailLocale, VerificationMailCopy> = {
	'zh-CN': {
		subject: 'HydCraft 安全验证码',
		preheader: '你正在进行操作，验证码如下。',
		title: '邮箱验证码',
		lead: (name, op) => `${name}，你正在进行${op}。`,
		codeLabel: '你的邮箱验证码如下：',
		expires: '验证码将在 10 分钟后失效。',
		ipPrefix: '本次请求 IP：',
		warning: '如果这不是你本人操作，请忽略本邮件并尽快检查账号安全设置。',
		footerNote: 'HydCraft 团队',
		systemFooter: '本邮件由系统自动发送，请勿直接回复。',
		textIntro: (name, op) => `${name}，你正在进行${op}。`,
	},
	'zh-TW': {
		subject: 'HydCraft 安全驗證碼',
		preheader: '你正在進行操作，驗證碼如下。',
		title: '信箱驗證碼',
		lead: (name, op) => `${name}，你正在進行${op}。`,
		codeLabel: '你的信箱驗證碼如下：',
		expires: '驗證碼將在 10 分鐘後失效。',
		ipPrefix: '本次請求 IP：',
		warning: '如果這不是你本人操作，請忽略本郵件並盡快檢查帳號安全設定。',
		footerNote: 'HydCraft 團隊',
		systemFooter: '本郵件由系統自動發送，請勿直接回覆。',
		textIntro: (name, op) => `${name}，你正在進行${op}。`,
	},
	'en-US': {
		subject: 'HydCraft security verification code',
		preheader: 'You are trying to verify your email. Your code is below.',
		title: 'Email Verification Code',
		lead: (name, op) => `${name}, you are trying to ${op}.`,
		codeLabel: 'Your email verification code is:',
		expires: 'The code expires in 10 minutes.',
		ipPrefix: 'Request IP:',
		warning:
			'If this was not you, ignore this email and review your account security settings.',
		footerNote: 'HydCraft Team',
		systemFooter: 'This email was sent automatically. Please do not reply.',
		textIntro: (name, op) => `${name}, you are trying to ${op}.`,
	},
	'ja-JP': {
		subject: 'HydCraft セキュリティ認証コード',
		preheader: '操作を続行しています。認証コードは以下の通りです。',
		title: 'メール認証コード',
		lead: (name, op) => `${name} さん、${op}を続行しています。`,
		codeLabel: 'メール認証コード：',
		expires: 'このコードは 10 分後に失効します。',
		ipPrefix: 'リクエスト IP：',
		warning:
			'この操作に心当たりがない場合は、このメールを無視し、アカウントの安全設定を確認してください。',
		footerNote: 'HydCraft チーム',
		systemFooter:
			'このメールはシステムから自動送信されています。返信しないでください。',
		textIntro: (name, op) => `${name} さん、${op}を続行しています。`,
	},
}

const formatSentAt = (locale: MailLocale): string =>
	new Intl.DateTimeFormat(locale, {
		dateStyle: 'medium',
		timeStyle: 'short',
		timeZone: 'Asia/Shanghai',
	}).format(new Date())

const formatIpAddress = (
	ipAddress: string | null,
	ipLocation: string | null | undefined,
): string =>
	ipAddress ? `${ipAddress}${ipLocation ? `（${ipLocation}）` : ''}` : ''

export const renderVerificationMail = (
	input: VerificationMailInput,
): MailTemplateRenderResult => {
	const mailLocale: MailLocale =
		userProfileLanguageToMailLocale[input.locale] ?? 'zh-CN'
	const copy = copyByLocale[mailLocale]
	const displayName = input.displayName || 'HydCraft User'
	const sentAt = formatSentAt(mailLocale)
	const ipAddress = formatIpAddress(input.ipAddress, input.ipLocation)
	const paragraphs = [
		copy.codeLabel,
		copy.expires,
		ipAddress ? `${copy.ipPrefix}${ipAddress}` : '',
		copy.warning,
	].filter(Boolean)

	const html = renderMailLayout({
		locale: mailLocale,
		title: copy.title,
		preheader: copy.preheader,
		lead: copy.lead(displayName, input.operation),
		code: input.code,
		paragraphs,
		footerNote: copy.footerNote,
		systemFooter: copy.systemFooter,
		sentAt,
	})

	const text = [
		copy.textIntro(displayName, input.operation),
		'',
		`${copy.codeLabel} ${input.code}`,
		copy.expires,
		ipAddress ? `${copy.ipPrefix}${ipAddress}` : '',
		copy.warning,
		'',
		`${copy.footerNote} · ${sentAt}`,
	]
		.filter(Boolean)
		.join('\n')

	return {
		subject: copy.subject,
		preheader: copy.preheader,
		html,
		text,
	}
}
