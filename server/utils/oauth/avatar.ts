import type {
	ExternalAccount,
	ExternalProvider,
	User,
} from '~/generated/prisma/client'
import { getAttachmentService } from '../attachment/runtime'
import { oauthProxyFetch } from './proxy'

const MICROSOFT_PROFILE_PHOTO_URL =
	'https://graph.microsoft.com/v1.0/me/photos/64x64/$value'

interface OAuthAvatarAsset {
	buffer: Buffer
	contentType: string
}

const normalizeImageContentType = (value: string | null): string | null => {
	if (!value) {
		return null
	}

	const normalized = value.split(';', 1)[0]?.trim().toLowerCase()

	return normalized && normalized.startsWith('image/') ? normalized : null
}

const fetchAvatarAsset = async (
	url: string,
	proxyEnabled: boolean,
	headers?: HeadersInit,
): Promise<OAuthAvatarAsset | null> => {
	const response = await oauthProxyFetch(
		url,
		{
			method: 'GET',
			headers: {
				accept: 'image/*',
				...(headers ?? {}),
			},
		},
		proxyEnabled,
	)

	if (response.status === 404) {
		return null
	}

	if (!response.ok) {
		throw new Error(`Avatar upstream request failed with ${response.status}`)
	}

	const contentType = normalizeImageContentType(
		response.headers.get('content-type'),
	)

	if (!contentType) {
		return null
	}

	const buffer = Buffer.from(await response.arrayBuffer())

	if (!buffer.byteLength) {
		return null
	}

	return {
		buffer,
		contentType,
	}
}

export const fetchOAuthAvatarAsset = async (input: {
	provider: ExternalProvider
	accessToken: string
	avatarUrl: string | null
	proxyEnabled: boolean
}): Promise<OAuthAvatarAsset | null> => {
	if (input.provider === 'MICROSOFT') {
		return await fetchAvatarAsset(MICROSOFT_PROFILE_PHOTO_URL, false, {
			authorization: `Bearer ${input.accessToken}`,
		})
	}

	if (!input.avatarUrl) {
		return null
	}

	const shouldProxyImageFetch =
		input.proxyEnabled &&
		(input.provider === 'GOOGLE' || input.provider === 'GITHUB')

	return await fetchAvatarAsset(input.avatarUrl, shouldProxyImageFetch)
}

const getPreferredAvatarUrl = (
	variants: { name: string; url: string | null }[],
) =>
	variants.find((variant) => variant.name === 'avatar_256')?.url ??
	variants.find((variant) => variant.name === 'avatar_128')?.url ??
	variants.find((variant) => variant.name === 'avatar_64')?.url ??
	null

export const syncOAuthAvatarAttachment = async (input: {
	user: User
	account: Pick<ExternalAccount, 'id'>
	asset: OAuthAvatarAsset | null
}): Promise<{
	avatarAttachmentId: string | null
	avatarUrl: string | null
}> => {
	if (!input.asset) {
		return {
			avatarAttachmentId: null,
			avatarUrl: null,
		}
	}

	const summary = await getAttachmentService().uploadAttachment(input.user, {
		purpose: 'external-account-avatar',
		category: 'oauth',
		ownerType: 'external-account',
		ownerId: input.account.id,
		contentType: input.asset.contentType,
		buffer: input.asset.buffer,
	})

	return {
		avatarAttachmentId: summary.id,
		avatarUrl: getPreferredAvatarUrl(summary.variants),
	}
}
