import { Context, Schema } from 'koishi'

interface RepeatState {
  content: string
  times: number
}

export const name = 'mute-repeater'

export interface Config {
  minTimes: number
  muteDuration: number
  maxDurationMultiplier: number
}

export const Config: Schema<Config> = Schema.object({
  minTimes: Schema.natural().min(1).default(5).description('最少重复次数'),
  muteDuration: Schema.natural().min(1).default(60).description('禁言时长，单位为分钟'),
  maxDurationMultiplier: Schema.natural().min(1).default(8).description('最大禁言时长倍率')
})

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function apply(ctx: Context, config: Config) {
  ctx.i18n.define('zh-CN', require('./locales/zh-CN'))

  const states: Record<string, RepeatState> = {}

  function getState(cid: string) {
    return states[cid] || (states[cid] = {
      content: '',
      times: 0
    })
  }

  ctx.guild().on('message-created', async session => {
    const state = getState(session.cid)
    if (session.content === state.content) {
      state.times += 1
      if (state.times >= config.minTimes) {
        state.times = 0
        const multiplier = getRandomInt(1, config.maxDurationMultiplier)
        await session.bot.muteGuildMember(session.guildId, session.userId, config.muteDuration * 60 * 1000 * multiplier)
        await session.send(session.text('muteNotice', { duration: config.muteDuration * multiplier }))
      }
    } else {
      state.content = session.content
      state.times = 0
    }
  })

  ctx.guild().on('send', session => {
    const state = getState(session.cid)
    if (session.content === state.content) {
      state.times += 1
    } else {
      state.content = session.content
      state.times = 0
    }
  })
}
