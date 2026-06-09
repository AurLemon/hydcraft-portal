import { getPublicAttachmentPolicies } from '../../utils/attachment/policies'

export default defineEventHandler(() => ({
	policies: getPublicAttachmentPolicies(),
}))
