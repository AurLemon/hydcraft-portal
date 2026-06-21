import type { User } from '~/generated/prisma/client'
import { prisma } from '../db/prisma'

export const isPartnerAdmin = (user: Pick<User, 'role'>): boolean =>
	user.role === 'ADMIN' || user.role === 'OWNER'

export const canEditPartner = async (
	user: Pick<User, 'id' | 'role'>,
	partnerId: string,
): Promise<boolean> => {
	if (isPartnerAdmin(user)) {
		return true
	}

	const assignment = await prisma.partnerEditor.findUnique({
		where: {
			partnerId_userId: {
				partnerId,
				userId: user.id,
			},
		},
		select: {
			id: true,
		},
	})

	return Boolean(assignment)
}
