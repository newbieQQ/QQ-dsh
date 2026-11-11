#!/usr/bin/env node
/** QQ-dsh bundle verification: provenance, host composition, client composition, patch shape. */
import assert from 'node:assert'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { register } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
let checks = 0
const ok = (cond, msg) => { assert.ok(cond, msg); checks++; console.log('PASS', msg) }

// 1. provenance: components.json matches the vendored package versions
const manifest = JSON.parse(readFileSync(join(ROOT, 'components.json'), 'utf8'))
ok(manifest.length === 4, 'four components vendored')
for (const c of manifest) {
  const pkg = JSON.parse(readFileSync(join(ROOT, c.vendorPath, 'package.json'), 'utf8'))
  ok(pkg.version === c.version && pkg.name === c.package, `${c.id}: version ${c.version} matches`)
}

// 2. syntax of the entry + client composition
for (const f of ['index.js', 'client.js']) {
  execFileSync('node', ['--check', join(ROOT, f)])
  ok(true, `${f} parses`)
}

// 3. host composition: apply() mounts exactly the four component plugins
register('./verify-loader.mjs', import.meta.url)
const entry = await import(join(ROOT, 'index.js'))
ok(entry.name === 'qq-dsh', 'bundle plugin name is qq-dsh')
const mounted = []
const fakeCtx = { plugin: (p, cfg) => mounted.push({ name: p.name, hasApply: typeof p.apply === 'function', cfg }) }
entry.apply(fakeCtx, { dshBrain: { enabled: true }, workspaceGroupsRemote: {} })
const names = mounted.map((m) => m.name).sort()
ok(JSON.stringify(names) === JSON.stringify(['dsh-better-chat', 'dsh-brain', 'sansheng-liubu-workbench-host', 'workspace-groups-remote']),
  `apply mounts the four plugins: ${names.join(', ')}`)
ok(mounted.every((m) => m.hasApply), 'every mounted plugin has an apply')
const brainMount = mounted.find((m) => m.name === 'dsh-brain')
ok(brainMount.cfg && brainMount.cfg.enabled === true, 'dshBrain sub-config reaches dsh-brain')

// 4. client composition: importing the client module registers the three
// module-loader clients, and its apply mounts the better-chat plugin.
globalThis.window = { __ModuleLoader__: { load: (def) => loads.push(def.id) } }
const loads = []
const clientMod = await import(join(ROOT, 'client.js'))
ok(clientMod.name === 'qq-dsh', 'client plugin name is qq-dsh')
ok(loads.length === 3, `client registers 3 loader modules: ${loads.join(', ')}`)
for (const id of ['workspace-groups-remote', 'dsh-brain', 'dsh-sansheng-liubu-workbench']) {
  ok(loads.includes(id), `client includes ${id}`)
}
const clientMounted = []
clientMod.apply({ plugin: (p) => clientMounted.push(p.name) })
ok(JSON.stringify(clientMounted) === JSON.stringify(['dsh-better-chat']), 'client apply mounts dsh-better-chat')

// 5. patch shape: one insert row for qq-dsh + the shell overrides, no stray rows
const patch = readFileSync(join(ROOT, 'cordis.patch.yml'), 'utf8')
ok(patch.includes("- id: qq-dsh") && patch.includes("name: 'qq-dsh'"), 'patch inserts the qq-dsh row')
ok(patch.includes('- id: better-sidebar') && patch.includes('terminal-controller'), 'patch carries the shell overrides')
ok(!/name: '(dsh-brain|workspace-groups-remote|dsh-better-chat)'/.test(patch), 'patch has no standalone component rows')

console.log(`\nverify-bundle: ${checks} checks passed`)
