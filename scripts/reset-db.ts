import { spawnSync } from 'node:child_process'

const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

const runStep = (label: string, args: string[]): void => {
	console.log(`\n[data:dev-reset] ${label}`)

	const result = spawnSync(pnpmCommand, args, {
		stdio: 'inherit',
		shell: false,
	})

	if (result.status !== 0) {
		process.exit(result.status ?? 1)
	}
}

runStep('Reset database', ['exec', 'prisma', 'db', 'push', '--force-reset'])
runStep('Generate Prisma client', ['db:generate'])
runStep('Run seed', ['db:seed'])

console.log('\n[data:dev-reset] Completed')
