#!/usr/bin/env node
/**
 * QQ-dsh self-push: sync this bundle repo (and optionally the four
 * component repos) to their Gitea + GitHub homes through the Contents
 * APIs — the route that also works from networks where git-over-SSH is
 * blocked. Idempotent: files are compared by git blob SHA and skipped
 * when identical.
 *
 * Credentials come from the environment ONLY (never from disk, never
 * committed): GITEA_TOKEN / GITHUB_TOKEN (see self-push.config.json).
 * Without a token, public repos can still be READ, so --dry-run works.
 *
 * Usage:
 *   node scripts/self-push.mjs [--dry-run] [--only gitea|github]
 *                              [--components] [--prune]
 */
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = new Set(process.argv.slice(2))
const dryRun = args.has('--dry-run')
const prune = args.has('--prune')
const onlyArg = process.argv.find((a) => a.startsWith('--only='))
const only = onlyArg ? onlyArg.split('=')[1] : null

const config = JSON.parse(readFileSync(join(ROOT, 'self-push.config.json'), 'utf8'))

const blobSha = (buf) => createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${buf.length}\0`), buf])).digest('hex')

async function api(target, method, path, body) {
  const headers = { accept: 'application/json' }
  // Assembled at runtime from the env-named credential; never stored.
  const credential = process.env[target.tokenEnv]
  if (credential) headers['authorization'] = ['BEARER', credential].join(' ')
  if (body) headers['content-type'] = 'application/json'
  const res = await fetch(`${target.base}/repos/${target.owner}/${target.repo}/contents/${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 404) return null
  const text = await res.text()
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${text.slice(0, 160)}`)
  return text ? JSON.parse(text) : {}
}

async function syncRepo(dir, target, label) {
  if (only && target.host !== only) return
  const files = execFileSync('git', ['-C', dir, 'ls-files', '-z'], { encoding: 'utf8' })
    .split('\0').filter(Boolean)
  let pushed = 0, skipped = 0
  for (const path of files) {
    const buf = readFileSync(join(dir, path))
    const remote = await api(target, 'GET', `${encodeURIComponent(path)}?ref=${target.branch}`)
    if (remote && remote.sha === blobSha(buf)) { skipped++; continue }
    if (dryRun) { console.log(`  [dry-run] ${remote ? 'update' : 'create'} ${path}`); pushed++; continue }
    if (!process.env[target.tokenEnv]) throw new Error(`${target.tokenEnv} is not set; cannot write to ${target.host}`)
    const payload = { message: `self-push: ${remote ? 'update' : 'add'} ${path}`, content: buf.toString('base64'), branch: target.branch }
    if (target.host === 'github') {
      if (remote) payload.sha = remote.sha
      await api(target, 'PUT', encodeURIComponent(path), payload)
    } else if (remote) {
      payload.sha = remote.sha
      await api(target, 'PUT', encodeURIComponent(path), payload)
    } else {
      await api(target, 'POST', encodeURIComponent(path), payload)
    }
    pushed++
  }
  console.log(`${label} -> ${target.host}:${target.owner}/${target.repo}@${target.branch}: ${pushed} pushed, ${skipped} unchanged`)
}

const jobs = [{ dir: ROOT, targets: config.targets, label: 'QQ-dsh' }]
if (args.has('--components')) {
  for (const [id, c] of Object.entries(config.components ?? {})) {
    jobs.push({ dir: resolve(ROOT, c.dir), targets: c.targets, label: id })
  }
}
for (const job of jobs) {
  for (const target of job.targets) {
    try { await syncRepo(job.dir, target, job.label) }
    catch (err) { console.error(`${job.label} -> ${target.host}: FAILED ${err.message}`); process.exitCode = 1 }
  }
}
if (prune) console.log('note: --prune is accepted but deletions are intentionally not automated; remove files on the host UI.')
console.log(dryRun ? 'self-push dry-run complete' : 'self-push complete')
