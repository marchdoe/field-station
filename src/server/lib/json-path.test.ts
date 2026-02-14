import { describe, it, expect } from 'vitest'
import { getAtPath, setAtPath, deleteAtPath } from './json-path.js'
import type { JsonObject } from '@/types/config.js'

describe('getAtPath', () => {
  it('gets top-level value', () => {
    expect(getAtPath({ foo: 'bar' }, 'foo')).toBe('bar')
  })

  it('gets nested value', () => {
    expect(getAtPath({ a: { b: { c: 42 } } }, 'a.b.c')).toBe(42)
  })

  it('returns undefined for missing path', () => {
    expect(getAtPath({ a: 1 }, 'b')).toBeUndefined()
  })
})

describe('setAtPath', () => {
  it('sets top-level value', () => {
    const obj: JsonObject = { foo: 'old' }
    const result = setAtPath(obj, 'foo', 'new')
    expect(result.foo).toBe('new')
  })

  it('sets nested value creating intermediates', () => {
    const obj: JsonObject = {}
    const result = setAtPath(obj, 'a.b.c', true)
    expect(result).toEqual({ a: { b: { c: true } } })
  })

  it('does not mutate original object', () => {
    const obj: JsonObject = { foo: 'bar' }
    setAtPath(obj, 'foo', 'baz')
    expect(obj.foo).toBe('bar')
  })

  it('preserves sibling keys', () => {
    const obj: JsonObject = { a: 1, b: 2 }
    const result = setAtPath(obj, 'a', 99)
    expect(result).toEqual({ a: 99, b: 2 })
  })
})

describe('deleteAtPath', () => {
  it('deletes top-level key', () => {
    const obj: JsonObject = { a: 1, b: 2 }
    const result = deleteAtPath(obj, 'a')
    expect(result).toEqual({ b: 2 })
  })

  it('deletes nested key', () => {
    const obj: JsonObject = { a: { b: 1, c: 2 } }
    const result = deleteAtPath(obj, 'a.b')
    expect(result).toEqual({ a: { c: 2 } })
  })

  it('does not mutate original object', () => {
    const obj: JsonObject = { a: 1 }
    deleteAtPath(obj, 'a')
    expect(obj.a).toBe(1)
  })

  it('returns unchanged object for missing path', () => {
    const obj: JsonObject = { a: 1 }
    const result = deleteAtPath(obj, 'b')
    expect(result).toEqual({ a: 1 })
  })
})
