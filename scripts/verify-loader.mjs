// Dev-only module resolution for verify-bundle.mjs: bare specifiers the
// vendor entries import (@deepseek-ai/* and friends) resolve against the
// locally installed DSH's node_modules, mirroring how the real host's
// module table would serve them.
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOTS = [
  process.env.QQDSH_DSH_DEPS,
  join(homedir(), '.local/lib/node_modules/@deepseek-ai/dsh/node_modules'),
  join(homedir(), '.local/lib/node_modules'),
].filter(Boolean)

export async function resolve(specifier, context, next) {
  if (
    specifier.startsWith('.') || specifier.startsWith('/') ||
    specifier.startsWith('file:') || specifier.startsWith('node:')
  ) return next(specifier, context)
  for (const root of ROOTS) {
    try {
      const req = createRequire(join(root, 'noop.js'))
      return { url: pathToFileURL(req.resolve(specifier)).href, shortCircuit: true }
    } catch { /* try next root */ }
  }
  return next(specifier, context)
}
