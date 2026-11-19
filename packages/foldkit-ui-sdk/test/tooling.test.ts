import { expect, test } from 'vitest'

import * as agent from '../src/agent'
import * as observe from '../src/observe'
import * as shortcuts from '../src/shortcuts'
import * as testing from '../src/testing'

test('re-export the framework-agnostic ui-sdk tooling', () => {
  expect(Object.keys(testing).length).toBeGreaterThan(0)
  expect(Object.keys(agent)).toEqual(expect.arrayContaining(['createAgent', 'agentTools']))
  expect(Object.keys(observe).length).toBeGreaterThan(0)
  expect(Object.keys(shortcuts).length).toBeGreaterThan(0)
})
