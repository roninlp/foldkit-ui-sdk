import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

import { describe, expect, test } from 'vitest'

import * as ui from '../src/index'

// Reads the same manifest the generator reads. Every tag UI SDK ships has to
// have a binding, and no binding may expose a property only the element or
// the framework owns.
const require = createRequire(import.meta.url)
const webPackage = require.resolve('@ui-sdk/web/package.json')
const manifest = JSON.parse(
  readFileSync(
    path.join(path.dirname(webPackage), 'custom-elements.json'),
    'utf8'
  )
)

type Declaration = {
  tagName: string
  members?: { kind: string; name: string; readonly?: boolean }[]
  events?: { name: string }[]
}
type Spec = {
  tag: string
  properties: Record<string, unknown>
  events: Record<string, unknown>
}

const modules = manifest.modules
  .filter((module: { declarations?: Declaration[] }) =>
    (module.declarations ?? []).some(declaration => declaration.tagName)
  )
  .map((module: { path: string; declarations: Declaration[] }) => ({
    entry: path.basename(module.path, '.js'),
    declarations: module.declarations.filter(declaration => declaration.tagName),
  }))
  .sort((left: { entry: string }, right: { entry: string }) =>
    left.entry.localeCompare(right.entry)
  )

const entries = new Map<string, Record<string, Spec>>()
for (const { entry } of modules) {
  const module = await import(`../src/entries/${entry}.ts`)
  entries.set(entry, module as Record<string, Spec>)
}

const pascal = (value: string) =>
  value
    .split('-')
    .filter(Boolean)
    .map(word => (word === 'otp' ? 'OTP' : word[0].toUpperCase() + word.slice(1)))
    .join('')

const allSpecs = [...entries.values()].flatMap(entry => Object.values(entry))

describe('generated bindings', () => {
  test('cover every tag UI SDK ships', () => {
    const expected = modules
      .flatMap((module: { declarations: Declaration[] }) => module.declarations)
      .map((declaration: Declaration) => declaration.tagName)
      .sort()
    const actual = allSpecs.map(spec => spec.tag).sort()
    expect(actual).toEqual(expected)
  })

  test('expose no framework-only properties', () => {
    const excluded = new Set(['api', 'controller', 'debug'])
    for (const spec of allSpecs) {
      for (const name of Object.keys(spec.properties)) {
        expect(excluded.has(name), `${spec.tag} exposes ${name}`).toBe(false)
      }
    }
  })

  test('expose every declared event', () => {
    for (const { entry, declarations } of modules) {
      const specs = Object.values(entries.get(entry) ?? {})
      for (const declaration of declarations) {
        const spec = specs.find(candidate => candidate.tag === declaration.tagName)
        expect(spec, `${entry} has a ${declaration.tagName} spec`).toBeDefined()
        expect(Object.keys(spec?.events ?? {}).sort()).toEqual(
          (declaration.events ?? []).map((event: { name: string }) => event.name).sort()
        )
      }
    }
  })

  test('export one namespace per entry', () => {
    for (const { entry } of modules) {
      expect(pascal(entry) in ui, `missing ${pascal(entry)}`).toBe(true)
    }
  })

  test('pin the UI SDK version the bindings were generated from', () => {
    expect(ui.uiSdkVersion).toBe(
      JSON.parse(
        readFileSync(path.join(path.dirname(webPackage), 'package.json'), 'utf8')
      ).version
    )
  })
})
