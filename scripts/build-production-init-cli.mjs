import { readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const distCliDir = path.join(projectRoot, 'dist-cli')

const patchRelativeImports = async (targetPath) => {
	const source = await readFile(targetPath, 'utf8')
	const patched = source.replace(
		/(from\s+['"])(\.\.?\/[^'"]+?)(['"])/g,
		(_, prefix, specifier, suffix) => {
			if (specifier.endsWith('.js') || specifier.endsWith('.json')) {
				return `${prefix}${specifier}${suffix}`
			}

			return `${prefix}${specifier}.js${suffix}`
		},
	)

	if (patched !== source) {
		await writeFile(targetPath, patched, 'utf8')
	}
}

const walkAndPatch = async (directory) => {
	const entries = await readdir(directory)

	for (const entry of entries) {
		const fullPath = path.join(directory, entry)
		const entryStat = await stat(fullPath)

		if (entryStat.isDirectory()) {
			await walkAndPatch(fullPath)
			continue
		}

		if (entry.endsWith('.js')) {
			await patchRelativeImports(fullPath)
		}
	}
}

const main = async () => {
	await rm(distCliDir, {
		force: true,
		recursive: true,
	})

	await execFileAsync(
		'pnpm',
		['exec', 'tsc', '-p', 'tsconfig.production-init.json'],
		{
			cwd: projectRoot,
			stdio: 'inherit',
		},
	)

	await walkAndPatch(distCliDir)
}

await main().catch((error) => {
	console.error(error)
	process.exitCode = 1
})
