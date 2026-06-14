export interface CapWidgetPatchOptions {
	fontFamily: string
	fullWidth?: boolean
	disableHoverLift?: boolean
}

const PATCHED_ATTR = 'data-hydcraft-cap-patched'
const PATCH_STYLE_ATTR = 'data-hydcraft-cap-style'

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

	if (existingStyle) {
		existingStyle.textContent = patchCss
		return
	}

	const style = document.createElement('style')
	style.setAttribute(PATCH_STYLE_ATTR, 'true')
	style.textContent = patchCss
	root.appendChild(style)
}
