import test from 'node:test'
import assert from 'node:assert/strict'
import { TOOLS } from './tools'

function toolDescription(name: string): string {
  const tool = TOOLS.find(candidate => candidate.name === name)
  assert.ok(tool, `${name} tool should exist`)
  return String(tool.description || '')
}

test('RFQ quotes and exchange orderbook are separate tools', () => {
  const rfqDescription = toolDescription('get_rfq_quotes')
  const orderbookDescription = toolDescription('get_orderbook')

  assert.match(rfqDescription, /RFQ/i)
  assert.match(rfqDescription, /quote/i)
  assert.doesNotMatch(rfqDescription, /orderbook/i)

  assert.match(orderbookDescription, /orderbook/i)
  assert.doesNotMatch(orderbookDescription, /RFQ/i)
})
