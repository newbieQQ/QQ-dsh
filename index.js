/**
 * QQ-dsh — personal plugin bundle for DSH (composition only).
 *
 * One install row loads the user's four plugins on this bundle's fiber:
 *
 * - dsh-sansheng-liubu (vendor/dsh-sansheng-liubu): the 三省六部 workbench
 *   host — ten independent department sessions per project, three-layer
 *   memory. Its panel client rides in ./client.js.
 * - dsh-brain (vendor/dsh-brain): the LongMemory bridge — turn reporting,
 *   memory_* tools, the Mnemon provider, bidirectional skill sync and the
 *   skill admin pages under /dsh-brain.
 * - workspace-groups-remote (vendor/workspace-groups-remote): grouped
 *   workspaces + vendored remote-ssh, itself a composition; its shell
 *   overrides live in this bundle's cordis.patch.yml.
 * - dsh-better-chat (vendor/dsh-better-chat): approval-card Enter/Esc
 *   (client-only; the host half is a no-op stub).
 *
 * Row config nests per plugin: { dshBrain: {...} } reaches dsh-brain,
 * { workspaceGroupsRemote: { remoteSsh: {...} } } reaches the merged
 * groups/remote bundle. Stored data is untouched by bundling: every
 * component keeps its own sidecars and settings namespaces.
 */
import * as sansheng from './vendor/dsh-sansheng-liubu/index.js'
import * as brain from './vendor/dsh-brain/lib/index.js'
import * as groupsRemote from './vendor/workspace-groups-remote/lib/index.js'
import * as betterChat from './vendor/dsh-better-chat/index.js'

/** Normalize an ESM namespace or a CJS default export into a plugin object. */
function plug(ns) {
  const p = ns && ns.default ? ns.default : ns
  return { name: p.name, inject: p.inject, apply: p.apply }
}

/** Plugin identity for cordis.yml rows. */
export const name = 'qq-dsh'

/** Services required before mounting (union of the components'). */
export const inject = ['webServer', 'subprocess', 'tools', 'workspaceRegistry']

/** Plugin body: mount all four components on this fiber. */
export function apply(ctx, config = {}) {
  const cfg = config && typeof config === 'object' && !Array.isArray(config) ? config : {}
  ctx.plugin(plug(sansheng))
  ctx.plugin(plug(brain), cfg.dshBrain ?? {})
  ctx.plugin(plug(groupsRemote), cfg.workspaceGroupsRemote ?? {})
  ctx.plugin(plug(betterChat))
}
