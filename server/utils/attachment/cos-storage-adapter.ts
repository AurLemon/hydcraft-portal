import COS from 'cos-nodejs-sdk-v5'
import { createApiError } from '../errors'
import type { StorageAdapter } from './storage-adapter'
import type { StorageProfileName, StorageProfiles } from './types'

interface CosStorageAdapterOptions {
	secretId: string
	secretKey: string
	region: string
	profiles: StorageProfiles
}

const requireConfig = (value: string, key: string): string => {
	if (!value) {
		throw createApiError({
			statusCode: 500,
			code: 'COS_CONFIG_MISSING',
			data: {
				key,
			},
		})
	}

	return value
}

const normalizePublicBaseUrl = (value: string): string =>
	value.replace(/\/$/, '')

export class CosStorageAdapter implements StorageAdapter {
	private readonly cos: COS
	private readonly region: string
	private readonly profiles: StorageProfiles

	constructor(options: CosStorageAdapterOptions) {
		this.region = requireConfig(options.region, 'COS_REGION')
		this.profiles = options.profiles
		this.cos = new COS({
			SecretId: requireConfig(options.secretId, 'COS_SECRET_ID'),
			SecretKey: requireConfig(options.secretKey, 'COS_SECRET_KEY'),
		})
	}

	private getProfile(profile: StorageProfileName) {
		const storageProfile = this.profiles[profile]
		requireConfig(storageProfile.bucket, `bucket:${profile}`)

		return storageProfile
	}

	private getObjectParams(profile: StorageProfileName, objectKey: string) {
		const storageProfile = this.getProfile(profile)

		return {
			Bucket: storageProfile.bucket,
			Region: this.region,
			Key: objectKey,
		}
	}

	async putObject(input: {
		profile: StorageProfileName
		objectKey: string
		body: Buffer
		contentType: string
	}): Promise<void> {
		await this.cos.putObject({
			...this.getObjectParams(input.profile, input.objectKey),
			Body: input.body,
			ContentLength: input.body.byteLength,
			ContentType: input.contentType,
		})
	}

	async deleteObject(input: {
		profile: StorageProfileName
		objectKey: string
	}): Promise<void> {
		await this.cos.deleteObject(
			this.getObjectParams(input.profile, input.objectKey),
		)
	}

	getPublicUrl(input: {
		profile: StorageProfileName
		objectKey: string
	}): string {
		const storageProfile = this.getProfile(input.profile)

		if (!storageProfile.publicBaseUrl) {
			throw createApiError({
				statusCode: 500,
				code: 'COS_PUBLIC_BASE_URL_MISSING',
			})
		}

		return `${normalizePublicBaseUrl(storageProfile.publicBaseUrl)}/${input.objectKey}`
	}
}

export const createCosStorageAdapter = (
	options: CosStorageAdapterOptions,
): StorageAdapter => new CosStorageAdapter(options)
