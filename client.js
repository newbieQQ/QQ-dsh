// QQ-dsh composed web client (hand-maintained composition).
//
// The four components ship two different client shapes:
// - workspace-groups-remote, dsh-brain and the sansheng panel are
//   module-loader files: evaluating them registers their module in the
//   host's graph under their own id. Side-effect imports below.
// - dsh-better-chat is an ESM client plugin ({ name, inject, apply });
//   this module re-exports a qq-dsh client plugin whose apply mounts it.
import './vendor/workspace-groups-remote/lib/client.js'
import './vendor/dsh-brain/client/index.js'
import './vendor/dsh-sansheng-liubu/workbench/panel/lib/client.js'
import * as betterChat from './vendor/dsh-better-chat/client.js'

export const name = 'qq-dsh'
export const inject = []

export function apply(ctx) {
  ctx.plugin({ name: betterChat.name ?? 'dsh-better-chat', inject: betterChat.inject, apply: betterChat.apply })
}
