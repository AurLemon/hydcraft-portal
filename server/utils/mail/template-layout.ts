import type { MailLocale } from './types'

interface MailAction {
	label: string
	url: string
}

export interface MailLayoutInput {
	locale: MailLocale
	title: string
	preheader: string
	lead: string
	paragraphs: string[]
	action?: MailAction
	code?: string
	footerNote: string
	systemFooter: string
	sentAt: string
}

export const escapeHtml = (value: string): string =>
	value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')

export const renderMailLayout = (input: MailLayoutInput): string => {
	const paragraphs = input.paragraphs
		.map(
			(paragraph) =>
				`<p style="margin: 0 0 14px; color: #475569; font-size: 15px; line-height: 1.7;">${escapeHtml(paragraph)}</p>`,
		)
		.join('')
	const action = input.action
		? `<tr>
				<td style="padding: 10px 0 22px;">
					<a href="${escapeHtml(input.action.url)}" style="display: inline-block; padding: 12px 18px; border-radius: 8px; background: #0f766e; color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none;">${escapeHtml(input.action.label)}</a>
				</td>
			</tr>`
		: ''
	const codeBlock = input.code
		? `<tr>
				<td style="padding: 10px 0 22px; text-align: center;">
					<div style="display: inline-block; padding: 14px 28px; border-radius: 10px; background: #f1f5f9; color: #0f172a; font-size: 28px; font-weight: 700; letter-spacing: 6px; line-height: 1; font-family: 'Courier New', Courier, monospace;">${escapeHtml(input.code)}</div>
				</td>
			</tr>`
		: ''

	return `<!doctype html>
<html lang="${input.locale}">
	<head>
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<title>${escapeHtml(input.title)}</title>
	</head>
	<body style="margin: 0; padding: 0; background: #f8fafc;">
		<div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent;">${escapeHtml(input.preheader)}</div>
		<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width: 100%; background: #f8fafc; border-collapse: collapse;">
			<tr>
				<td align="center" style="padding: 32px 16px;">
					<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width: 100%; max-width: 560px; border-collapse: collapse;">
						<tr>
							<td style="padding: 0 0 14px;">
								<div style="font-family: Inter, MiSans, 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif; font-size: 13px; font-weight: 800; letter-spacing: 0.08em; color: #0f766e; text-transform: uppercase;">HydCraft Portal</div>
							</td>
						</tr>
						<tr>
							<td style="background: #ffffff; border: 1px solid #dbe5ef; border-radius: 8px; padding: 28px; font-family: Inter, MiSans, 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif;">
								<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
									<tr>
										<td style="padding: 0 0 18px;">
											<h1 style="margin: 0; color: #0f172a; font-size: 24px; line-height: 1.35; font-weight: 800;">${escapeHtml(input.title)}</h1>
										</td>
									</tr>
									<tr>
										<td style="padding: 0 0 16px;">
											<p style="margin: 0; color: #334155; font-size: 16px; line-height: 1.75;">${escapeHtml(input.lead)}</p>
										</td>
									</tr>
									${action}
									${codeBlock}
									<tr>
										<td>${paragraphs}</td>
									</tr>
									<tr>
										<td style="padding-top: 10px; border-top: 1px solid #e2e8f0;">
											<p style="margin: 14px 0 0; color: #64748b; font-size: 13px; line-height: 1.7;">${escapeHtml(input.footerNote)}</p>
											<p style="margin: 6px 0 0; color: #94a3b8; font-size: 12px; line-height: 1.6;">${escapeHtml(input.sentAt)}</p>
										</td>
									</tr>
								</table>
							</td>
						</tr>
						<tr>
							<td style="padding: 18px 4px 0; text-align: center; color: #94a3b8; font-family: Inter, MiSans, 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif; font-size: 12px; line-height: 1.7;">
								${escapeHtml(input.systemFooter)} Copyright © ${new Date().getFullYear()} Team HydCraft.
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
	</body>
</html>`
}
