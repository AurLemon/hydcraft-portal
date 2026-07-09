<template>
	<div class="mt-5 h-36">
		<Line v-if="points.length > 0" :data="chartData" :options="chartOptions" />
		<div
			v-else
			class="flex h-full items-center justify-center rounded-lg border border-slate-200 text-sm text-slate-400 dark:border-slate-800"
		>
			{{ emptyText }}
		</div>
	</div>
</template>

<script setup lang="ts">
import {
	CategoryScale,
	Chart as ChartJS,
	Filler,
	LineElement,
	LinearScale,
	PointElement,
	Tooltip,
	type ChartData,
	type ChartOptions,
} from 'chart.js'
import { Line } from 'vue-chartjs'
import type { MinecraftServerPlayerHistoryPoint } from './types'

interface AdminServerPlayersChartProps {
	points: MinecraftServerPlayerHistoryPoint[]
	label: string
	emptyText: string
	locale: string
}

const props = defineProps<AdminServerPlayersChartProps>()

ChartJS.register(
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	Filler,
	Tooltip,
)

const formatTime = (value: string): string =>
	new Intl.DateTimeFormat(props.locale, {
		hour: '2-digit',
		minute: '2-digit',
	}).format(new Date(value))

const chartData = computed<ChartData<'line'>>(() => ({
	labels: props.points.map((point) => formatTime(point.observedAt)),
	datasets: [
		{
			label: props.label,
			data: props.points.map((point) => point.onlinePlayers),
			borderColor: '#0ea5e9',
			backgroundColor: 'rgba(14, 165, 233, 0.12)',
			borderWidth: 2,
			fill: true,
			pointRadius: 2,
			pointHoverRadius: 4,
			tension: 0.25,
		},
	],
}))

const chartOptions = computed<ChartOptions<'line'>>(() => ({
	responsive: true,
	maintainAspectRatio: false,
	interaction: {
		intersect: false,
		mode: 'index',
	},
	plugins: {
		legend: {
			display: false,
		},
		tooltip: {
			displayColors: false,
			callbacks: {
				label: (context) => {
					const value =
						typeof context.parsed.y === 'number' ? context.parsed.y : 0

					return `${props.label}: ${value}`
				},
			},
		},
	},
	scales: {
		x: {
			grid: {
				display: false,
			},
			ticks: {
				color: '#64748b',
				maxTicksLimit: 6,
			},
		},
		y: {
			beginAtZero: true,
			ticks: {
				color: '#64748b',
				precision: 0,
			},
			grid: {
				color: 'rgba(148, 163, 184, 0.18)',
			},
		},
	},
}))
</script>
