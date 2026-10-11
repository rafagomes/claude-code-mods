import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { CommandRunInput, On, RenderElement, RenderPropsOf } from 'claude-code'
import { asText, ownWords, parseFeedback, shouldCheck } from './register'

test('skips slash commands, shell escapes and very short input', () => {
  const own = (t: string) => shouldCheck(t, ownWords(t))
  expect(own('/clear')).toBe(false)
  expect(own('  /review the open pull request now')).toBe(false)
  expect(own('! ls -la /tmp now')).toBe(false)
  expect(own('yes do it')).toBe(false)
  expect(own('pull our new updates from ai-workflow')).toBe(true)
})

test('judges the prefix on what was typed, not the stripped text', () => {
  const t = '<pasted_content id="x">log</pasted_content>/etc/hosts is broken again here'
  expect(shouldCheck(t, ownWords(t))).toBe(true)
})

test('strips pasted content and code fences', () => {
  const t = 'look at this <pasted_content id="x">some log</pasted_content> and ```code``` please'
  expect(ownWords(t)).toBe('look at this   and   please')
})

test('parses a reply, dropping malformed issues', () => {
  const reply = 'Sure: {"issues":[{"kind":"grammar","original":"a feedback","improved":"feedback","why":"uncountable"},{"kind":"style","original":"x","improved":"y"},{"kind":"fluency","original":"same","improved":"same"}],"natural":"Give me feedback."}'
  expect(parseFeedback(reply, 40)).toEqual({
    issues: [{ kind: 'grammar', original: 'a feedback', improved: 'feedback', why: 'uncountable' }],
    natural: null,
    tip: null,
  })
})

test('treats an empty or broken reply correctly', () => {
  expect(parseFeedback('{"issues":[],"natural":"ignored"}', 40)).toEqual({ issues: [], natural: null, tip: null })
  expect(parseFeedback('looks fine', 40)).toBeNull()
  expect(parseFeedback('{not json}', 40)).toBeNull()
})

test('keeps the rewrite only for 2+ issues on a short message', () => {
  const two = '{"issues":[{"kind":"grammar","original":"a","improved":"b","why":""},{"kind":"fluency","original":"c","improved":"d","why":""}],"natural":"N"}'
  expect(parseFeedback(two, 120)?.natural).toBe('N')
  expect(parseFeedback(two, 2500)?.natural).toBeNull()
})

test('survives braces in prose around the JSON', () => {
  const reply = 'Result: {"issues":[{"kind":"grammar","original":"a","improved":"b","why":"x"}],"natural":null} (kept {braces} out)'
  expect(parseFeedback(reply, 40)?.issues.length).toBe(1)
})

test('formats a bulleted transcript line', () => {
  const text = asText({
    issues: [{ kind: 'fluency', original: 'not usual', improved: 'unusual', why: 'more idiomatic' }],
    natural: null,
    tip: null,
  })
  expect(text).toBe('✎ English\n  • [fluency] "not usual" → "unusual" — more idiomatic')
})

test('keeps a well-formed tip, even with nothing to correct', () => {
  const reply = '{"issues":[],"natural":null,"tip":{"phrase":" cut to the chase ","meaning":"get to the point"}}'
  expect(parseFeedback(reply, 40)).toEqual({
    issues: [],
    natural: null,
    tip: { phrase: 'cut to the chase', meaning: 'get to the point' },
  })
})

test('drops a tip that is malformed or would not fit one line', () => {
  const tip = (t: string) => parseFeedback(`{"issues":[],"natural":null,"tip":${t}}`, 40)?.tip
  expect(tip('"cut to the chase"')).toBeNull()
  expect(tip('{"phrase":"cut to the chase"}')).toBeNull()
  expect(tip('{"phrase":"  ","meaning":"get to the point"}')).toBeNull()
  expect(tip(JSON.stringify({ phrase: 'x'.repeat(61), meaning: 'm' }))).toBeNull()
  expect(tip(JSON.stringify({ phrase: 'p', meaning: 'm'.repeat(121) }))).toBeNull()
  expect(tip(JSON.stringify({ phrase: 'p', meaning: 'one\ntwo' }))).toBeNull()
  expect(tip(JSON.stringify({ phrase: '\u001b[31mp', meaning: 'm' }))).toBeNull()
})

// The session beneath the mod: every prompt the coach sends to the model.
const world = (on: On) => {
  const sent: string[] = []
  on('session.start', (_$, e) => ({ cwd: e.cwd }) as never)
  on('command.register', (_$, e) => ({ value: { command: e.name } }) as never)
  on('prompt.submit', (_$, e) => ({ text: e.text }) as never)
  on('ui.log', () => ({ value: undefined }) as never)
  on('ui.render', () => ({ type: 'engine', ref: 0 }) as RenderElement)
  on('model.complete', (_$, e) => {
    sent.push(e.prompt)
    const text = '{"issues":[],"natural":null,"tip":{"phrase":"kick off","meaning":"start"}}'
    return { value: { isAnswered: true, text } } as never
  })
  return sent
}

const START = { cwd: '/repo', surface: 'terminal', isInteractive: true } as const
const BAND = { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 120 } as RenderPropsOf['AbovePrompt']
const say = ($: Engine, text: string) => $.prompt.submit({ text, wait: false, origin: { kind: 'composer' } } as never)
const coach = ($: Engine, args: string) => $.command.run({ command: 'english-coach', args } as CommandRunInput)

// Whether the band above the prompt shows `text`.
const shows = async ($: Engine, text: string) => {
  const ui = await $.ui.mount({ plugin: 'english-coach', surface: 'terminal', component: 'AbovePrompt', props: BAND })
  const found = await ui.find({ type: 'Text', text })
  await ui.unmount()
  return found !== undefined
}

test('is on from the start, and shows a check that has only a tip', async ($, on) => {
  const sent = world(on)
  await $.session.start(START)
  expect(await shows($, 'kick off')).toBe(false)

  await say($, 'please run the whole test suite')
  expect(sent).toEqual(['please run the whole test suite'])
  expect(await shows($, 'kick off')).toBe(true)
  expect(await shows($, '  start')).toBe(true)
})

test('/english-coach off stops the checks and clears the band; on resumes them', async ($, on) => {
  const sent = world(on)
  await $.session.start(START)
  await say($, 'please run the whole test suite')

  expect(await shows($, 'kick off')).toBe(true)

  expect((await coach($, 'off')).text).toBe('English coach off.')
  expect(await shows($, 'kick off')).toBe(false)
  await say($, 'please run the whole test suite again')
  expect(sent.length).toBe(1)

  await coach($, 'on')
  await say($, 'please run the whole test suite once more')
  expect(sent.length).toBe(2)
})

test('/english-coach with no argument toggles', async ($, on) => {
  world(on)
  await $.session.start(START)
  expect((await coach($, '')).text).toBe('English coach off.')
  expect((await coach($, '')).text).toBe('English coach on.')
  expect((await coach($, 'of')).text).toBe('Usage: /english-coach [on|off]')
  expect((await coach($, '')).text).toBe('English coach off.')
})

test('adds the tip as the last transcript line', () => {
  const tip = { phrase: 'cut to the chase', meaning: 'get to the point' }
  expect(asText({ issues: [], natural: null, tip })).toBe('✎ English\n  ✦ Learn: "cut to the chase" — get to the point')
  const issues = [{ kind: 'grammar' as const, original: 'a', improved: 'b', why: '' }]
  expect(asText({ issues, natural: 'N', tip })).toBe(
    '✎ English\n  • [grammar] "a" → "b"\n  ✓ Natural: N\n  ✦ Learn: "cut to the chase" — get to the point',
  )
})
