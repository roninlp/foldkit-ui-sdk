// The reference sink puts its classes on the part itself (React renders the
// real control). UI SDK's Web Components sometimes wrap the real control in a
// `display: contents` host, so a class on `<ui-input>` or `<ui-toggle>` would
// not paint. Inside `.sink`, copy a host's classes onto its first element child
// when the host is a known wrapper or computes to `display: contents`, and
// remove only the classes this bridge added. The copied reference CSS then
// keeps working after every Foldkit patch.

// Parts whose first child is the real control even if the computed display is
// not available yet (the first sync can run before stylesheets settle).
const wrappers = new Set([
  'ui-toggle',
  'ui-button',
  'ui-input',
  'ui-textarea',
])

const added = new WeakMap<Element, Set<string>>()

const bridge = (host: Element) => {
  if (!(host instanceof HTMLElement) || !host.localName.startsWith('ui-')) return
  if (
    !wrappers.has(host.localName) &&
    getComputedStyle(host).display !== 'contents'
  ) {
    return
  }
  const target = host.firstElementChild
  if (!(target instanceof HTMLElement)) return
  let mine = added.get(target)
  if (!mine) {
    mine = new Set()
    added.set(target, mine)
  }
  for (const name of [...mine]) {
    if (!host.classList.contains(name)) {
      target.classList.remove(name)
      mine.delete(name)
    }
  }
  for (const name of host.classList) {
    if (!target.classList.contains(name)) {
      target.classList.add(name)
      mine.add(name)
    }
  }
}

const sync = () => {
  const sink = document.querySelector('.sink')
  if (!sink) return
  for (const element of sink.querySelectorAll('*')) bridge(element)
}

let scheduled = false
const schedule = () => {
  if (scheduled) return
  scheduled = true
  requestAnimationFrame(() => {
    scheduled = false
    sync()
  })
}

let started = false

export const installClassBridge = () => {
  if (started || typeof window === 'undefined') return
  started = true
  const observer = new MutationObserver(schedule)
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class'],
  })
  schedule()
  // Stylesheets can settle after the first render.
  setTimeout(sync, 250)
  void document.fonts?.ready.then(sync)
}
