export type Issue = { kind: 'grammar' | 'fluency'; original: string; improved: string; why: string }
export type Tip = { phrase: string; meaning: string }
export type Feedback = { issues: Issue[]; natural: string | null; tip: Tip | null }

declare module 'claude-code' {
  interface PluginState {
    'english-coach': { last: Feedback | null }
  }
}
