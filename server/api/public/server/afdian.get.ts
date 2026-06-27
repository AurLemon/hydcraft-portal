import { getPublicAfdianSponsorStats } from '../../../utils/afdian/stats'

export default defineEventHandler(async () => {
	return await getPublicAfdianSponsorStats()
})
