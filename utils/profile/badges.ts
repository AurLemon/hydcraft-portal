export interface ProfileBadgeStyle {
	class: string
	icon: string
	iconClass: string
}

export interface ProfileBadgePaletteItem extends ProfileBadgeStyle {
	key: string
	label: string
}

export const neutralBadgeStyle: ProfileBadgeStyle = {
	class:
		'border border-slate-200 bg-slate-50 text-slate-700 ring-1 ring-slate-200/80 dark:border-white/20 dark:bg-slate-950/38 dark:text-slate-100 dark:ring-white/10',
	icon: 'i-lucide-shield',
	iconClass: 'text-slate-500 dark:text-slate-300',
}

export const profileBadgePalette: ProfileBadgePaletteItem[] = [
	{
		key: 'amber',
		label: 'Amber',
		class:
			'border border-amber-200 bg-amber-50 text-amber-700 ring-1 ring-amber-200/80 dark:border-amber-400/70 dark:bg-amber-950/32 dark:text-amber-200 dark:ring-amber-300/18',
		icon: 'i-lucide-star',
		iconClass: 'text-amber-500 dark:text-amber-300',
	},
	{
		key: 'sky',
		label: 'Sky',
		class:
			'border border-sky-200 bg-sky-50 text-sky-700 ring-1 ring-sky-200/80 dark:border-sky-400/70 dark:bg-sky-950/32 dark:text-sky-200 dark:ring-sky-300/18',
		icon: 'i-lucide-badge-check',
		iconClass: 'text-sky-500 dark:text-sky-300',
	},
	{
		key: 'emerald',
		label: 'Emerald',
		class:
			'border border-emerald-200 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80 dark:border-emerald-400/70 dark:bg-emerald-950/32 dark:text-emerald-200 dark:ring-emerald-300/18',
		icon: 'i-lucide-circle-check',
		iconClass: 'text-emerald-500 dark:text-emerald-300',
	},
	{
		key: 'rose',
		label: 'Rose',
		class:
			'border border-rose-200 bg-rose-50 text-rose-700 ring-1 ring-rose-200/80 dark:border-rose-400/70 dark:bg-rose-950/32 dark:text-rose-200 dark:ring-rose-300/18',
		icon: 'i-lucide-heart',
		iconClass: 'text-rose-500 dark:text-rose-300',
	},
	{
		key: 'violet',
		label: 'Violet',
		class:
			'border border-violet-200 bg-violet-50 text-violet-700 ring-1 ring-violet-200/80 dark:border-violet-400/70 dark:bg-violet-950/32 dark:text-violet-200 dark:ring-violet-300/18',
		icon: 'i-lucide-sparkles',
		iconClass: 'text-violet-500 dark:text-violet-300',
	},
	{
		key: 'cyan',
		label: 'Cyan',
		class:
			'border border-cyan-200 bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200/80 dark:border-cyan-400/70 dark:bg-cyan-950/32 dark:text-cyan-200 dark:ring-cyan-300/18',
		icon: 'i-lucide-gem',
		iconClass: 'text-cyan-500 dark:text-cyan-300',
	},
	{
		key: 'neutral',
		label: 'Neutral',
		...neutralBadgeStyle,
	},
]

export const profileBadgeStyles: Record<string, ProfileBadgeStyle> =
	Object.fromEntries(
		profileBadgePalette.map((item) => [
			item.key,
			{
				class: item.class,
				icon: item.icon,
				iconClass: item.iconClass,
			},
		]),
	)

export const getProfileBadgeStyle = (color: string | null): ProfileBadgeStyle =>
	profileBadgeStyles[color ?? 'neutral'] ?? neutralBadgeStyle

const darkNeutralBadgeStyle: ProfileBadgeStyle = {
	class:
		'border border-white/20 bg-slate-950/38 text-slate-100 ring-1 ring-white/10',
	icon: 'i-lucide-shield',
	iconClass: 'text-slate-300',
}

export const profileBadgeDarkStyles: Record<string, ProfileBadgeStyle> = {
	amber: {
		class:
			'border border-amber-400/70 bg-amber-950/32 text-amber-200 ring-1 ring-amber-300/18',
		icon: 'i-lucide-star',
		iconClass: 'text-amber-300',
	},
	sky: {
		class:
			'border border-sky-400/70 bg-sky-950/32 text-sky-200 ring-1 ring-sky-300/18',
		icon: 'i-lucide-badge-check',
		iconClass: 'text-sky-300',
	},
	emerald: {
		class:
			'border border-emerald-400/70 bg-emerald-950/32 text-emerald-200 ring-1 ring-emerald-300/18',
		icon: 'i-lucide-circle-check',
		iconClass: 'text-emerald-300',
	},
	rose: {
		class:
			'border border-rose-400/70 bg-rose-950/32 text-rose-200 ring-1 ring-rose-300/18',
		icon: 'i-lucide-heart',
		iconClass: 'text-rose-300',
	},
	violet: {
		class:
			'border border-violet-400/70 bg-violet-950/32 text-violet-200 ring-1 ring-violet-300/18',
		icon: 'i-lucide-sparkles',
		iconClass: 'text-violet-300',
	},
	cyan: {
		class:
			'border border-cyan-400/70 bg-cyan-950/32 text-cyan-200 ring-1 ring-cyan-300/18',
		icon: 'i-lucide-gem',
		iconClass: 'text-cyan-300',
	},
	neutral: darkNeutralBadgeStyle,
}

export const getProfileBadgeDarkStyle = (
	color: string | null,
): ProfileBadgeStyle =>
	profileBadgeDarkStyles[color ?? 'neutral'] ?? darkNeutralBadgeStyle
