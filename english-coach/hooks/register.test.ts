import { expect, test } from 'claude-code/testing'
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
})

test('adds the tip as the last transcript line', () => {
  const tip = { phrase: 'cut to the chase', meaning: 'get to the point' }
  expect(asText({ issues: [], natural: null, tip })).toBe('✎ English\n  ✦ Learn: "cut to the chase" — get to the point')
  const issues = [{ kind: 'grammar' as const, original: 'a', improved: 'b', why: '' }]
  expect(asText({ issues, natural: 'N', tip })).toBe(
    '✎ English\n  • [grammar] "a" → "b"\n  ✓ Natural: N\n  ✦ Learn: "cut to the chase" — get to the point',
  )
})
