import { createHighlighter } from '@tanstack/highlight/core'
import { shell } from '@tanstack/highlight/languages/shell'
import { ts } from '@tanstack/highlight/languages/ts'

// One synchronous highlighter, created once at module scope and shared by
// every rendering path — a server render and the browser import this same
// module and get the same registrations, so the highlighted markup is
// identical on both sides. There is no async registration step and no
// per-theme markup: the renderer emits one compact `th-*` tree and the
// palette lives in CSS, in styles.css's `--th-*` variables.
//
// Only the languages the site's code samples use are registered: TypeScript
// for the binding and agent examples, shell for the install and check
// commands.
export const highlighter = createHighlighter({
  languages: [ts, shell],
})

/** The code sample languages the site renders. */
export type CodeLang = 'ts' | 'shell'

/** One highlighted sample: an escaped `<pre class="th-code"><code>` tree. */
export const codeHtml = (source: string, lang: CodeLang): string =>
  highlighter.highlight(source, { lang }).html
