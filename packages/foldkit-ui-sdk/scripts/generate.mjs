// Generates the typed Foldkit bindings from the manifest `@ui-sdk/web` ships.
//
//   node scripts/generate.mjs             Write src/entries and src/index.ts.
//   node scripts/generate.mjs --check     Fail when the files on disk are stale.
//   node scripts/generate.mjs --manifest <path>   Read another manifest.
//
// The manifest is the same Custom Elements Manifest the package publishes at
// `@ui-sdk/web/custom-elements.json`, so the bindings cannot drift from the
// tags, properties and events that shipped.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const packageDir = path.resolve(here, '..')
const sourceDir = path.join(packageDir, 'src')
const entriesDir = path.join(sourceDir, 'entries')
const docsFile = path.resolve(packageDir, '../../docs/components.md')
const require = createRequire(import.meta.url)

const args = process.argv.slice(2)
const check = args.includes('--check')
const manifestFlag = args.indexOf('--manifest')
const manifestPath =
  manifestFlag >= 0
    ? path.resolve(args[manifestFlag + 1])
    : path.join(path.dirname(require.resolve('@ui-sdk/web/package.json')), 'custom-elements.json')

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const webVersion = JSON.parse(
  readFileSync(path.join(path.dirname(manifestPath), 'package.json'), 'utf8')
).version

// Properties every element has, or that only the framework should read. The
// rest are the options and state UI SDK documents.
const excludedProperties = new Set(['api', 'controller', 'debug'])

const capitalize = (word) => word.charAt(0).toUpperCase() + word.slice(1)
const words = (value) => value.split(/[-_.]/).filter(Boolean)

function pascal(value) {
  return words(value)
    .map((word) => (word === 'otp' ? 'OTP' : capitalize(word)))
    .join('')
}

function exportName(tagName, entry) {
  const short = tagName.replace(/^ui-/, '')
  if (short === entry) return 'Root'
  const prefix = `${entry}-`
  if (short.startsWith(prefix)) return pascal(short.slice(prefix.length))
  return pascal(short)
}

function quote(value) {
  return JSON.stringify(value)
}

// A TypeScript type from the manifest as the narrowest Effect Schema we can
// prove. Anything with a generic, an element, a function or a template literal
// stays `Schema.Unknown`: the binding still works, the value is just untyped.
function schemaOf(typeText) {
  const text = String(typeText ?? 'unknown').trim().replace(/\s+/g, ' ')
  const simple = {
    boolean: 'Schema.Boolean',
    string: 'Schema.String',
    number: 'Schema.Number',
    unknown: 'Schema.Unknown',
    any: 'Schema.Unknown',
    'string[]': 'Schema.Array(Schema.String)',
    'readonly string[]': 'Schema.Array(Schema.String)',
    'number[]': 'Schema.Array(Schema.Number)',
    'readonly number[]': 'Schema.Array(Schema.Number)',
  }
  if (simple[text]) return simple[text]

  if (text.startsWith('readonly ')) return schemaOf(text.slice('readonly '.length))
  if (text.endsWith('[]')) return `Schema.Array(${schemaOf(text.slice(0, -2))})`
  if (text.startsWith('(') && text.endsWith(')')) return schemaOf(text.slice(1, -1))

  const members = splitTopLevel(text, '|').map((member) => member.trim())
  if (members.length > 1) {
    const nullish = members.filter((member) => member === 'null' || member === 'undefined')
    const rest = members.filter((member) => member !== 'null' && member !== 'undefined')
    if (nullish.length > 0 && rest.length === 1) {
      const inner = schemaOf(rest[0])
      if (inner === 'Schema.Unknown') return inner
      return nullish.includes('null')
        ? `Schema.NullOr(${inner})`
        : `Schema.UndefinedOr(${inner})`
    }
    if (rest.includes('string')) return 'Schema.String'
    if (rest.every((member) => isLiteral(member))) {
      return literalsSchema(rest)
    }
    if (rest.every((member) => member === 'boolean' || isLiteral(member))) {
      const parts = rest.map((member) =>
        member === 'boolean' ? 'Schema.Boolean' : literalsSchema([member])
      )
      return `Schema.Union([${[...new Set(parts)].join(', ')}])`
    }
    return 'Schema.Unknown'
  }

  if (isLiteral(text)) return literalsSchema([text])
  if (text === 'ISODate' || text === 'ISOMonth') return 'Schema.String'
  return 'Schema.Unknown'
}

function literalsSchema(members) {
  return members.length === 1
    ? `Schema.Literal(${literal(members[0])})`
    : `Schema.Literals([${members.map(literal).join(', ')}])`
}

function splitTopLevel(text, separator) {
  const parts = []
  let depth = 0
  let start = 0
  for (let index = 0; index < text.length; index++) {
    const character = text[index]
    if ('<({['.includes(character)) depth++
    else if ('>)}]'.includes(character)) depth--
    else if (character === separator && depth === 0) {
      parts.push(text.slice(start, index))
      start = index + 1
    }
  }
  parts.push(text.slice(start))
  return parts
}

function isLiteral(text) {
  return (
    /^"[^"]*"$/.test(text) ||
    /^'[^']*'$/.test(text) ||
    /^(true|false)$/.test(text) ||
    /^-?\d+(\.\d+)?$/.test(text) ||
    text === 'null' ||
    text === 'undefined'
  )
}

function literal(text) {
  return text.replace(/^'/, '"').replace(/'$/, '"')
}

// The detail each event decodes. Change events get the fields a caller reads;
// anything richer stays Unknown rather than inventing a shape.
function eventSchema(typeText) {
  const text = String(typeText ?? '').trim().replace(/\s+/g, ' ')
  const change =
    /^Ui(?:Detailed)?ChangeEvent<([\s\S]+)>$/.exec(text) ??
    /^CustomEvent<UiChangeDetail<([\s\S]+)>>$/.exec(text)
  if (change) {
    const [valueType] = splitTopLevel(change[1], ',').map((part) => part.trim())
    return `Schema.Struct({
      value: ${schemaOf(valueType)},
      reason: Schema.String,
      source: Schema.String,
    })`
  }
  if (text === 'UiOpenChangeCompleteEvent') {
    return 'Schema.Struct({ value: Schema.Boolean })'
  }
  if (/^UiDismissAttemptEvent</.test(text)) {
    return 'Schema.Struct({ reason: Schema.String })'
  }
  if (text === 'UiHighlightEvent') {
    return 'Schema.Struct({ value: Schema.Unknown })'
  }
  if (text === 'UiLoadMoreEvent') {
    return 'Schema.Struct({})'
  }
  const custom = /^CustomEvent<([\s\S]+)>$/.exec(text)
  if (custom) {
    const inner = custom[1].trim()
    if (inner.startsWith('{')) return objectSchema(inner)
    return 'Schema.Unknown'
  }
  return 'Schema.Unknown'
}

// `{ value: string; index: number; event?: Event }` becomes a Struct of the
// fields whose types are provable. Optional fields stay optional.
function objectSchema(text) {
  const body = text.replace(/^\{/, '').replace(/\}$/, '')
  const fields = []
  for (const part of splitTopLevel(body, ';')) {
    const field = /^([A-Za-z_$][\w$]*)(\?)?\s*:\s*([\s\S]+)$/.exec(part.trim())
    if (!field) continue
    const [, name, optional, type] = field
    fields.push(`${name}: ${optional ? `Schema.optional(${schemaOf(type)})` : schemaOf(type)}`)
  }
  return fields.length > 0 ? `Schema.Struct({ ${fields.join(', ')} })` : 'Schema.Struct({})'
}

function summary(description) {
  const first = String(description ?? '')
    .split(/\n\s*\n/)[0]
    .replace(/\s+/g, ' ')
    .trim()
  return first.length > 220 ? `${first.slice(0, 217)}...` : first
}

const modules = manifest.modules
  .filter((module) => (module.declarations ?? []).some((declaration) => declaration.tagName))
  .map((module) => ({
    entry: path.basename(module.path, '.js'),
    declarations: (module.declarations ?? []).filter((declaration) => declaration.tagName),
  }))
  .sort((left, right) => left.entry.localeCompare(right.entry))

const output = new Map()
const seen = new Map()

for (const { entry, declarations } of modules) {
  const names = new Set()
  const blocks = declarations
    .slice()
    .sort((left, right) => left.tagName.localeCompare(right.tagName))
    .map((declaration) => {
      const name = exportName(declaration.tagName, entry)
      if (names.has(name)) {
        throw new Error(`${entry}: two tags export ${name}`)
      }
      names.add(name)
      seen.set(declaration.tagName, { entry, name })

      const properties = new Map()
      for (const member of declaration.members ?? []) {
        if (member.kind !== 'field') continue
        if (member.readonly || excludedProperties.has(member.name)) continue
        properties.set(member.name, schemaOf(member.type?.text))
      }

      const events = new Map()
      for (const event of declaration.events ?? []) {
        events.set(event.name, eventSchema(event.type?.text))
      }

      const propertyLines =
        properties.size === 0
          ? []
          : [...properties].map(([name, schema]) => `    ${name}: ${schema},`)
      const eventLines =
        events.size === 0
          ? []
          : [...events].map(([name, schema]) => `    ${quote(name)}: ${schema},`)

      return [
        '/**',
        ` * ${summary(declaration.description) || `\`<${declaration.tagName}>\`.`}`,
        ` * @see https://ui-sdk.dev/docs/web-components/components/${entry}`,
        ' */',
        `export const ${name} = CustomElement.define({`,
        `  tag: ${quote(declaration.tagName)},`,
        '  properties: {',
        ...propertyLines,
        '  },',
        '  events: {',
        ...eventLines,
        '  },',
        '})',
      ].join('\n')
    })

  output.set(
    path.join(entriesDir, `${entry}.ts`),
    [
      '// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.',
      '// Do not edit. Run `npm run generate` after upgrading ui-sdk.',
      `import "@ui-sdk/web/${entry}"`,
      'import { Schema } from "effect"',
      'import { CustomElement } from "foldkit"',
      '',
      ...blocks.flatMap((block) => [block, '']),
    ].join('\n')
  )
}

const namespaces = modules.map(
  ({ entry }) => `export * as ${pascal(entry)} from "./entries/${entry}.js"`
)

output.set(
  path.join(sourceDir, 'index.ts'),
  [
    '// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.',
    '// Do not edit. Run `npm run generate` after upgrading ui-sdk.',
    '//',
    '// Importing the root registers every UI SDK element. Use a component subpath',
    '// (`foldkit-ui-sdk/menu`) to register only what a view renders.',
    ...namespaces,
    '',
    'export const uiSdkVersion = ' + quote(webVersion),
    '',
  ].join('\n')
)

const docsRows = modules.map(({ entry, declarations }) => {
  const specs = declarations
    .map((declaration) => seen.get(declaration.tagName).name)
    .sort()
    .join(', ')
  return `| \`${pascal(entry)}\` | \`foldkit-ui-sdk/${entry}\` | ${specs} | [docs](https://ui-sdk.dev/docs/web-components/components/${entry}) |`
})

output.set(
  docsFile,
  [
    '# Components',
    '',
    'Generated from `@ui-sdk/web` `' + webVersion + '`. Each namespace is one import',
    'entry: importing it registers its elements.',
    '',
    '| Namespace | Import | Specs | UI SDK docs |',
    '| --- | --- | --- | --- |',
    ...docsRows,
    '',
  ].join('\n')
)

let stale = false
for (const [file, content] of output) {
  const current = existsSync(file) ? readFileSync(file, 'utf8') : undefined
  if (current === content) continue
  stale = true
  if (!check) {
    mkdirSync(path.dirname(file), { recursive: true })
    writeFileSync(file, content)
  }
}

if (check) {
  if (stale) {
    console.error('Generated bindings are stale. Run `npm run generate`.')
    process.exitCode = 1
  } else {
    console.log(`Generated bindings are current (${seen.size} tags, ${modules.length} entries).`)
  }
} else {
  rmSync(path.join(entriesDir, '.gitkeep'), { force: true })
  console.log(`Generated ${seen.size} bindings across ${modules.length} entries from UI SDK ${webVersion}.`)
}
