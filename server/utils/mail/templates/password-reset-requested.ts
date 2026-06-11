import { renderMailLayout } from '../template-layout'
import type { MailLocale, MailTemplateRenderResult } from '../types'

export interface PasswordResetRequestedTemplateInput {
	locale: MailLocale
	displayName: string | null
	handle: string
	siteUrl: string
	requestedAt: Date
}

interface PasswordResetRequestedCopy {
	subject: string
	preheader: string
	title: string
	lead: (name: string) => string
	actionLabel: string
	paragraphs: string[]
	footerNote: string
	systemFooter: string
	textIntro: (name: string) => string
}

const copyByLocale: Record<MailLocale, PasswordResetRequestedCopy> = {
	'zh-CN': {
		subject: 'HydCraft 密码重置请求已收到',
		preheader:
			'如果这是你本人发起的操作，请回到 HydCraft 页面继续查看后续步骤。',
		title: '密码重置请求已收到',
		lead: (name) => `${name}，我们收到了你的 Hydroline ID 密码重置请求。`,
		actionLabel: '打开 HydCraft',
		paragraphs: [
			'当前站点已经具备邮件通知基础，但密码重置令牌的完整校验链路仍需单独启用。',
			'如果这不是你本人发起的操作，可以忽略本邮件；你的密码不会因为这封邮件而被修改。',
			'为了账号安全，请不要把后续收到的验证码、令牌或链接转发给任何人。',
		],
		footerNote: 'HydCraft Portal 团队',
		systemFooter: '本邮件由系统自动发送，请勿直接回复。',
		textIntro: (name) => `${name}，我们收到了你的 Hydroline ID 密码重置请求。`,
	},
	'zh-TW': {
		subject: 'HydCraft 密碼重設請求已收到',
		preheader:
			'如果這是你本人發起的操作，請回到 HydCraft 頁面繼續查看後續步驟。',
		title: '密碼重設請求已收到',
		lead: (name) => `${name}，我們收到了你的 Hydroline ID 密碼重設請求。`,
		actionLabel: '開啟 HydCraft',
		paragraphs: [
			'目前站點已具備郵件通知基礎，但密碼重設令牌的完整校驗流程仍需單獨啟用。',
			'如果這不是你本人發起的操作，可以忽略本郵件；你的密碼不會因為這封郵件而被修改。',
			'為了帳號安全，請不要把後續收到的驗證碼、令牌或連結轉發給任何人。',
		],
		footerNote: 'HydCraft Portal 團隊',
		systemFooter: '本郵件由系統自動傳送，請勿直接回覆。',
		textIntro: (name) => `${name}，我們收到了你的 Hydroline ID 密碼重設請求。`,
	},
	'en-US': {
		subject: 'HydCraft password reset request received',
		preheader:
			'If you requested this, return to HydCraft to continue with the next steps.',
		title: 'Password reset request received',
		lead: (name) =>
			`${name}, we received a password reset request for your Hydroline ID.`,
		actionLabel: 'Open HydCraft',
		paragraphs: [
			'The site now has the mail notification foundation, while the full reset-token verification flow still needs to be enabled separately.',
			'If you did not request this, you can ignore this email. Your password will not be changed by this message.',
			'For account security, never forward verification codes, tokens, or links to anyone.',
		],
		footerNote: 'HydCraft Portal Team',
		systemFooter: 'This email was sent automatically. Please do not reply.',
		textIntro: (name) =>
			`${name}, we received a password reset request for your Hydroline ID.`,
	},
	'ja-JP': {
		subject: 'HydCraft パスワード再設定リクエストを受け付けました',
		preheader:
			'この操作に心当たりがある場合は、HydCraft の画面に戻って次の手順を確認してください。',
		title: 'パスワード再設定リクエストを受け付けました',
		lead: (name) =>
			`${name} さん、Hydroline ID のパスワード再設定リクエストを受け付けました。`,
		actionLabel: 'HydCraft を開く',
		paragraphs: [
			'サイトにはメール通知の基礎が追加されていますが、再設定トークンの完全な検証フローは別途有効化する必要があります。',
			'この操作に心当たりがない場合は、このメールを無視してください。このメールだけでパスワードが変更されることはありません。',
			'アカウント保護のため、認証コード、トークン、リンクを他人に転送しないでください。',
		],
		footerNote: 'HydCraft Portal Team',
		systemFooter:
			'このメールは自動送信されています。直接返信しないでください。',
		textIntro: (name) =>
			`${name} さん、Hydroline ID のパスワード再設定リクエストを受け付けました。`,
	},
}

const formatSentAt = (date: Date, locale: MailLocale): string =>
	new Intl.DateTimeFormat(locale, {
		dateStyle: 'medium',
		timeStyle: 'short',
		timeZone: 'Asia/Shanghai',
	}).format(date)

export const renderPasswordResetRequestedMail = (
	input: PasswordResetRequestedTemplateInput,
): MailTemplateRenderResult => {
	const copy = copyByLocale[input.locale]
	const displayName = input.displayName?.trim() || input.handle
	const sentAt = formatSentAt(input.requestedAt, input.locale)
	const html = renderMailLayout({
		locale: input.locale,
		title: copy.title,
		preheader: copy.preheader,
		lead: copy.lead(displayName),
		action: {
			label: copy.actionLabel,
			url: input.siteUrl,
		},
		paragraphs: copy.paragraphs,
		footerNote: copy.footerNote,
		systemFooter: copy.systemFooter,
		sentAt,
	})
	const text = [
		copy.textIntro(displayName),
		'',
		...copy.paragraphs,
		'',
		`${copy.actionLabel}: ${input.siteUrl}`,
		`${copy.footerNote} · ${sentAt}`,
	].join('\n')

	return {
		subject: copy.subject,
		preheader: copy.preheader,
		html,
		text,
	}
}
