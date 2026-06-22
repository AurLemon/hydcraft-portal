import { listPublicFriendLinks } from '../../utils/friend-links/service'

export default defineEventHandler(async () => await listPublicFriendLinks())
