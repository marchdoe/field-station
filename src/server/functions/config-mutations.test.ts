import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  readJsonFileSafe,
  writeJsonFileSafe,
  applyUpdateSetting,
  applyDeleteSetting,
  applyMoveSetting,
} from '../lib/config-writer.js'

describe('readJsonFileSafe', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'fs-test-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true })
  })

  it('reads valid JSON file', () => {
    const file = join(tmpDir, 'test.json')
    writeFileSync(file, '{"a":1}')
    expect(readJsonFileSafe(file)).toEqual({ a: 1 })
  })

  it('returns empty object for missing file', () => {
    expect(readJsonFileSafe(join(tmpDir, 'missing.json'))).toEqual({})
  })
})

describe('writeJsonFileSafe', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'fs-test-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true })
  })

  it('writes JSON with 2-space indent and trailing newline', () => {
    const file = join(tmpDir, 'out.json')
    writeJsonFileSafe(file, { hello: 'world' })
    const content = readFileSync(file, 'utf-8')
    expect(content).toBe('{\n  "hello": "world"\n}\n')
  })

  it('creates parent directories if needed', () => {
    const file = join(tmpDir, 'sub', 'dir', 'out.json')
    writeJsonFileSafe(file, { ok: true })
    expect(existsSync(file)).toBe(true)
  })
})

describe('applyUpdateSetting', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'fs-test-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true })
  })

  it('sets a new key in an existing file', () => {
    const file = join(tmpDir, 'settings.json')
    writeFileSync(file, '{"existing":"value"}')
    applyUpdateSetting(file, 'newKey', 'newValue')
    const result = JSON.parse(readFileSync(file, 'utf-8'))
    expect(result).toEqual({ existing: 'value', newKey: 'newValue' })
  })

  it('sets a nested key', () => {
    const file = join(tmpDir, 'settings.json')
    writeFileSync(file, '{}')
    applyUpdateSetting(file, 'a.b', true)
    const result = JSON.parse(readFileSync(file, 'utf-8'))
    expect(result).toEqual({ a: { b: true } })
  })

  it('creates the file if it does not exist', () => {
    const file = join(tmpDir, 'settings.json')
    applyUpdateSetting(file, 'key', 'val')
    const result = JSON.parse(readFileSync(file, 'utf-8'))
    expect(result).toEqual({ key: 'val' })
  })
})

describe('applyDeleteSetting', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'fs-test-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true })
  })

  it('removes a key from the file', () => {
    const file = join(tmpDir, 'settings.json')
    writeFileSync(file, '{"a":1,"b":2}')
    applyDeleteSetting(file, 'a')
    const result = JSON.parse(readFileSync(file, 'utf-8'))
    expect(result).toEqual({ b: 2 })
  })

  it('throws if file does not exist', () => {
    const file = join(tmpDir, 'missing.json')
    expect(() => applyDeleteSetting(file, 'a')).toThrow()
  })
})

describe('applyMoveSetting', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'fs-test-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true })
  })

  it('copies value to target and removes from source', () => {
    const from = join(tmpDir, 'from.json')
    const to = join(tmpDir, 'to.json')
    writeFileSync(from, '{"key":"value","other":1}')
    writeFileSync(to, '{"existing":true}')
    applyMoveSetting(from, to, 'key')
    expect(JSON.parse(readFileSync(from, 'utf-8'))).toEqual({ other: 1 })
    expect(JSON.parse(readFileSync(to, 'utf-8'))).toEqual({ existing: true, key: 'value' })
  })

  it('throws if key does not exist in source', () => {
    const from = join(tmpDir, 'from.json')
    const to = join(tmpDir, 'to.json')
    writeFileSync(from, '{}')
    writeFileSync(to, '{}')
    expect(() => applyMoveSetting(from, to, 'missing')).toThrow()
  })
})
