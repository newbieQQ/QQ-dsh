#!/usr/bin/env node
/**
 * QQ-dsh build: vendor the four component plugins from their sibling
 * source repos, then generate cordis.patch.yml (merged patch)
 * and components.json (provenance). client.js is hand-maintained:
 * it imports the vendored client entries (see its header).
 *
 * Sources (siblings of this repo):
 *   ../dsh-sansheng-liubu, ../dsh-cloud-memory (dsh-brain),
 *   ../dsh-workspace-groups-remote, ../dsh-better-chat
 * Re-running is idempotent: vendor/ is rebuilt from scratch each time.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = (p) => resolve(ROOT, '..', p)

const COMPONENTS = [
  {
    id: 'dsh-sansheng-liubu',
    sourceDir: SRC('dsh-sansheng-liubu'),
    sourceRepo: 'DeepsSeekHarness/dsh-sansheng-liubu',
    copy: [
      { from: 'index.js' }, { from: 'package.json' }, { from: 'LICENSE', optional: true },
      { from: 'workbench', dir: true },
    ],
    clientFile: 'workbench/panel/lib/client.js',
  },
  {
    id: 'dsh-brain',
    sourceDir: SRC('dsh-cloud-memory'),
    sourceRepo: 'DeepsSeekHarness/dsh-brain',
    copy: [
      { from: 'lib', dir: true }, { from: 'client', dir: true },
      { from: 'package.json' }, { from: 'LICENSE', optional: true },
    ],
    clientFile: 'client/index.js',
  },
  {
    id: 'workspace-groups-remote',
    sourceDir: SRC('dsh-workspace-groups-remote'),
    sourceRepo: 'DeepsSeekHarness/workspace-groups-remote',
    copy: [
      { from: 'lib', dir: true }, { from: 'package.json' }, { from: 'LICENSE', optional: true },
    ],
    clientFile: 'lib/client.js',
  },
  {
    id: 'dsh-better-chat',
    sourceDir: SRC('dsh-better-chat'),
    sourceRepo: 'DeepsSeekHarness/dsh-better-chat',
    copy: [
      { from: 'index.js' }, { from: 'client.js' }, { from: 'package.json' }, { from: 'LICENSE', optional: true },
    ],
    clientFile: 'client.js',
  },
]

const skipPath = (p) =>
  p.split('/').includes('test') || p.split('/').includes('tests') ||
  /\.test\.[cm]?js$/.test(p) || /\.map$/.test(p) || p.includes('/lib/types/')

function copyOne(base, item, dest) {
  const from = join(base, item.from)
  if (!existsSync(from)) {
    if (item.optional) return
    throw new Error(`missing source: ${from}`)
  }
  cpSync(from, join(dest, item.from), {
    recursive: Boolean(item.dir),
    filter: (src) => !skipPath(src),
  })
}

const manifest = []
rmSync(join(ROOT, 'vendor'), { recursive: true, force: true })
for (const c of COMPONENTS) {
  if (!existsSync(c.sourceDir)) throw new Error(`source repo not found: ${c.sourceDir}`)
  const dest = join(ROOT, 'vendor', c.id)
  mkdirSync(dest, { recursive: true })
  for (const item of c.copy) copyOne(c.sourceDir, item, dest)
  const pkg = JSON.parse(readFileSync(join(dest, 'package.json'), 'utf8'))
  const commit = execFileSync('git', ['-C', c.sourceDir, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  manifest.push({
    id: c.id, package: pkg.name, version: pkg.version,
    sourceRepo: c.sourceRepo, sourceCommit: commit, vendorPath: `vendor/${c.id}`,
  })
  console.log(`vendored ${c.id} v${pkg.version} @ ${commit.slice(0, 7)}`)
}

// ---- cordis.patch.yml: insert row + workspace-groups-remote overrides ----
const wgrPatch = readFileSync(join(SRC('dsh-workspace-groups-remote'), 'cordis.patch.yml'), 'utf8')
const marker = '# 自动覆盖 better-sidebar'
const at = wgrPatch.indexOf(marker)
if (at < 0) throw new Error('wgr patch override marker not found')
const overrides = wgrPatch.slice(at)
if (!overrides.includes('terminal-controller')) throw new Error('wgr overrides incomplete')
const patch = `# QQ-dsh bundle patch
#
# One insert row loads the bundle entry, which composes all four plugins.
# Migration: remove the four standalone bundles (dsh-sansheng-liubu-mode /
# dsh-sansheng-liubu-panel, dsh-brain, workspace-groups-remote,
# dsh-better-chat) from the profile and add qq-dsh instead. Stored data is
# kept: every component reads its own sidecars and settings namespaces.
- insert:
    - id: qq-dsh
      name: 'qq-dsh'
      config:
        dshBrain:
          enabled: true
          baseUrl: https://your-memory-host/api/longmemory
          clientId: dsh-desktop
          skillsSyncEnabled: true
        workspaceGroupsRemote: {}
${overrides}`
writeFileSync(join(ROOT, 'cordis.patch.yml'), patch)

writeFileSync(join(ROOT, 'components.json'), JSON.stringify(manifest, null, 2) + '\n')
console.log('generated cordis.patch.yml, components.json')
