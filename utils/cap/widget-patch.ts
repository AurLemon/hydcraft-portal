export interface CapWidgetPatchOptions {
	fontFamily: string
	fullWidth?: boolean
	disableHoverLift?: boolean
}

const PATCHED_ATTR = 'data-hydcraft-cap-patched'
const PATCH_STYLE_ATTR = 'data-hydcraft-cap-style'
const BRANDING_LABEL = 'Hydroline Captcha'

const patchBranding = (root: ShadowRoot): void => {
	const brandingLink = Array.from(
		root.querySelectorAll<HTMLAnchorElement>('a'),
	).find((anchor) => anchor.textContent?.trim() === 'Cap-Worker')

	if (!brandingLink) {
		return
	}

	if (root.textContent?.includes(BRANDING_LABEL)) {
		return
	}

	const brandingText = document.createElement('span')
	brandingText.textContent = BRANDING_LABEL
	brandingText.className = brandingLink.className
	brandingText.setAttribute('style', brandingLink.getAttribute('style') ?? '')
	brandingText.setAttribute('aria-label', BRANDING_LABEL)

	for (const attributeName of brandingLink.getAttributeNames()) {
		if (
			attributeName === 'class' ||
			attributeName === 'style' ||
			attributeName === 'href' ||
			attributeName === 'target' ||
			attributeName === 'rel'
		) {
			continue
		}

		brandingText.setAttribute(
			attributeName,
			brandingLink.getAttribute(attributeName) ?? '',
		)
	}

	brandingLink.replaceWith(brandingText)
}

const createPatchStyle = (options: CapWidgetPatchOptions): string => {
	const rules: string[] = []

	rules.push(`
		.captcha,
		.captcha * {
			font-family: ${options.fontFamily};
		}
	`)

	if (options.fullWidth) {
		rules.push(`
			.captcha {
				width: 100%;
			}
		`)
	}

	if (options.disableHoverLift) {
		rules.push(`
			.captcha:hover,
			.captcha:active {
				transform: none !important;
			}
		`)
	}

	return rules.join('\n')
}

export const applyCapWidgetPatch = (
	widget: HTMLElement | null,
	options: CapWidgetPatchOptions,
	attempts = 0,
): void => {
	if (!widget) {
		return
	}

	if (options.fullWidth) {
		widget.setAttribute('data-cap-fullwidth', 'true')
		widget.style.setProperty('--cap-widget-width', '100%')
	}

	widget.style.setProperty('--cap-font', options.fontFamily)
	widget.setAttribute(PATCHED_ATTR, 'true')

	const root = widget.shadowRoot

	if (!root) {
		if (attempts < 12) {
			window.requestAnimationFrame(() => {
				applyCapWidgetPatch(widget, options, attempts + 1)
			})
		}

		return
	}

	const patchCss = createPatchStyle(options)
	const existingStyle = root.querySelector<HTMLStyleElement>(
		`style[${PATCH_STYLE_ATTR}]`,
	)

	patchBranding(root)

	if (existingStyle) {
		existingStyle.textContent = patchCss
		return
	}

	const style = document.createElement('style')
	style.setAttribute(PATCH_STYLE_ATTR, 'true')
	style.textContent = patchCss
	root.appendChild(style)
}
