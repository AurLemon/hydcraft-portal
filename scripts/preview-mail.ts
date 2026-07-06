import { mkdir, writeFile } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { createServer, type ServerResponse } from 'node:http'
import { resolve } from 'node:path'

import { renderVerificationMail } from '../server/utils/mail/templates'
import { getVerificationOperation } from '../server/utils/security/account-security'
import type {
	MailLocale,
	MailTemplateRenderResult,
} from '../server/utils/mail/types'

interface PreviewMail {
	filename: string
	label: string
	locale: MailLocale
	template: MailTemplateRenderResult
}

const outputDir = resolve(process.cwd(), 'tmp/mail-preview')
const host = '127.0.0.1'
const defaultPort = 4174
const locales: MailLocale[] = ['zh-CN', 'zh-TW', 'en-US', 'ja-JP']
const contentTypes: Record<string, string> = {
	html: 'text/html; charset=utf-8',
	css: 'text/css; charset=utf-8',
	js: 'text/javascript; charset=utf-8',
	json: 'application/json; charset=utf-8',
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	svg: 'image/svg+xml; charset=utf-8',
	webp: 'image/webp',
}

const localeToProfileLanguage = {
	'zh-CN': 'ZH_CN',
	'zh-TW': 'ZH_TW',
	'en-US': 'EN_US',
	'ja-JP': 'JA_JP',
} as const

const escapeHtml = (value: string): string =>
	value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;')

const sendText = (
	response: ServerResponse,
	statusCode: number,
	message: string,
): void => {
	response.writeHead(statusCode, {
		'content-type': 'text/plain; charset=utf-8',
	})
	response.end(message)
}

const resolveRequestPath = (url: string | undefined): string | null => {
	const parsedUrl = new URL(url ?? '/', `http://${host}`)
	const pathname = decodeURIComponent(parsedUrl.pathname)
	const normalizedPath = pathname === '/' ? '/index.html' : pathname

	if (normalizedPath.includes('..')) {
		return null
	}

	return resolve(outputDir, `.${normalizedPath}`)
}

const getContentType = (filePath: string): string => {
	const extension = filePath.split('.').at(-1)?.toLowerCase() ?? ''
	return contentTypes[extension] ?? 'application/octet-stream'
}

const wrapPreviewPage = (mail: PreviewMail): string => `<!doctype html>
<html lang="${mail.locale}">
	<head>
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<title>${escapeHtml(mail.label)}</title>
		<style>
			body {
				margin: 0;
				background: #e2e8f0;
				color: #0f172a;
				font-family: Inter, MiSans, "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
			}

			header {
				box-sizing: border-box;
				width: 100%;
				padding: 18px 24px;
				background: #ffffff;
				border-bottom: 1px solid #cbd5e1;
			}

			h1 {
				margin: 0 0 8px;
				font-size: 18px;
				line-height: 1.4;
			}

			p {
				margin: 0;
				color: #475569;
				font-size: 13px;
				line-height: 1.6;
			}

			iframe {
				display: block;
				width: 100%;
				min-height: calc(100vh - 92px);
				border: 0;
				background: #ffffff;
			}
		</style>
	</head>
	<body>
		<header>
			<h1>${escapeHtml(mail.label)}</h1>
			<p>Subject: ${escapeHtml(mail.template.subject)}</p>
			${mail.template.preheader ? `<p>Preheader: ${escapeHtml(mail.template.preheader)}</p>` : ''}
		</header>
		<iframe title="${escapeHtml(mail.label)}" srcdoc="${escapeHtml(mail.template.html)}"></iframe>
	</body>
</html>`

const renderPreviews = (): PreviewMail[] =>
	locales.flatMap((locale) => [
		{
			filename: `verification-${locale}.html`,
			label: `Email verification (${locale})`,
			locale,
			template: renderVerificationMail({
				displayName: 'AurLemon',
				code: '102938',
				operation: '验证邮箱',
				ipAddress: '203.0.113.24',
				ipLocation: '美国 加利福尼亚州 洛杉矶',
				locale: localeToProfileLanguage[locale],
			}),
		},
		{
			filename: `password-reset-requested-${locale}.html`,
			label: `Password reset code (${locale})`,
			locale,
			template: renderVerificationMail({
				displayName: 'AurLemon',
				code: '654321',
				operation: getVerificationOperation(
					'PASSWORD_RESET',
					localeToProfileLanguage[locale],
				),
				ipAddress: '203.0.113.24',
				ipLocation: '美国 加利福尼亚州 洛杉矶',
				locale: localeToProfileLanguage[locale],
			}),
		},
	])

const renderIndex = (previews: PreviewMail[]): string => `<!doctype html>
<html lang="zh-CN">
	<head>
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<title>HydCraft Mail Preview</title>
		<style>
			body {
				margin: 0;
				background: #f8fafc;
				color: #0f172a;
				font-family: Inter, MiSans, "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
			}

			main {
				box-sizing: border-box;
				width: min(880px, 100%);
				margin: 0 auto;
				padding: 32px 20px;
			}

			h1 {
				margin: 0 0 8px;
				font-size: 24px;
				line-height: 1.35;
			}

			p {
				margin: 0 0 24px;
				color: #475569;
				font-size: 14px;
				line-height: 1.7;
			}

			ul {
				display: grid;
				grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
				gap: 12px;
				margin: 0;
				padding: 0;
				list-style: none;
			}

			a {
				display: block;
				padding: 14px 16px;
				border: 1px solid #dbe5ef;
				border-radius: 8px;
				background: #ffffff;
				color: #3791be;
				font-size: 14px;
				font-weight: 700;
				line-height: 1.5;
				text-decoration: none;
			}

			a:hover {
				border-color: #3791be;
			}
		</style>
	</head>
	<body>
		<main>
			<h1>HydCraft Mail Preview</h1>
			<p>这些文件由现有 TypeScript 邮件模板生成，只用于本地预览。</p>
			<ul>
				${previews
					.map(
						(mail) =>
							`<li><a href="./${escapeHtml(mail.filename)}">${escapeHtml(mail.label)}</a></li>`,
					)
					.join('')}
			</ul>
		</main>
	</body>
</html>`

const main = async (): Promise<void> => {
	const previews = renderPreviews()

	await mkdir(outputDir, { recursive: true })
	await Promise.all(
		previews.map((mail) =>
			writeFile(resolve(outputDir, mail.filename), wrapPreviewPage(mail)),
		),
	)
	await writeFile(resolve(outputDir, 'index.html'), renderIndex(previews))

	const server = createServer((request, response) => {
		const filePath = resolveRequestPath(request.url)

		if (!filePath || !filePath.startsWith(outputDir)) {
			sendText(response, 403, 'Forbidden')
			return
		}

		const stream = createReadStream(filePath)

		stream.on('error', () => {
			sendText(response, 404, 'Not found')
		})
		stream.on('open', () => {
			response.writeHead(200, {
				'content-type': getContentType(filePath),
			})
		})
		stream.pipe(response)
	})

	const listen = (port: number): void => {
		server.once('error', (error: NodeJS.ErrnoException) => {
			if (error.code === 'EADDRINUSE') {
				listen(port + 1)
				return
			}

			throw error
		})

		server.listen(port, host, () => {
			console.log(`Mail previews generated at ${outputDir}/index.html`)
			console.log(`Mail preview server is running at http://localhost:${port}`)
			console.log('Press Ctrl+C to stop the preview server.')
		})
	}

	process.once('SIGINT', () => {
		server.close(() => {
			process.exit(0)
		})
	})

	listen(defaultPort)
}

await main()
