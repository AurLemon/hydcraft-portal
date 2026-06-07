interface PortalRedirectOptions {
	fallbackPath: string
	loginPath: string
}

type PortalRedirectInput = string | null | undefined | (string | null)[]

const normalizePathname = (pathname: string): string => {
	const withoutTrailingSlash = pathname.replace(/\/+$/, '')
	return withoutTrailingSlash || '/'
}

const isLoginPathname = (pathname: string, loginPath: string): boolean => {
	const normalizedPathname = normalizePathname(pathname)
	const normalizedLoginPath = normalizePathname(loginPath)

	return (
		normalizedPathname === normalizedLoginPath ||
		/^\/(?:[a-z]{2}(?:-[A-Z]{2})?\/)?login$/.test(normalizedPathname)
	)
}

export const normalizePortalRedirectPath = (
	input: PortalRedirectInput,
	options: PortalRedirectOptions,
): string => {
	const value = Array.isArray(input) ? input[0] : input

	if (!value || !value.startsWith('/') || value.startsWith('//')) {
		return options.fallbackPath
	}

	let url: URL

	try {
		url = new URL(value, 'https://hydcraft.portal')
	} catch {
		return options.fallbackPath
	}

	if (isLoginPathname(url.pathname, options.loginPath)) {
		return options.fallbackPath
	}

	return `${url.pathname}${url.search}${url.hash}`
}

export const getPortalRedirectQuery = (
	input: PortalRedirectInput,
	options: PortalRedirectOptions,
): { redirect?: string } => {
	const redirect = normalizePortalRedirectPath(input, options)

	return redirect === options.fallbackPath ? {} : { redirect }
}
