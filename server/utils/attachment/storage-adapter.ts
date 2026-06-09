import type { StorageProfileName } from './types'

export interface StorageAdapter {
	putObject(input: {
		profile: StorageProfileName
		objectKey: string
		body: Buffer
		contentType: string
	}): Promise<void>

	deleteObject(input: {
		profile: StorageProfileName
		objectKey: string
	}): Promise<void>

	getPublicUrl(input: {
		profile: StorageProfileName
		objectKey: string
	}): string
}
