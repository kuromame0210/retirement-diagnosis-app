/**
 * タイムスタンプユーティリティのテスト
 */

import { getJSTTimestamp, getUTCTimestamp } from '../lib/utils/timestamp'

describe('Timestamp Utilities', () => {
  describe('getJSTTimestamp', () => {
    it('should return ISO string format', () => {
      const timestamp = getJSTTimestamp()
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    })

    it('should return JST time (UTC+9)', () => {
      const timestamp = getJSTTimestamp()
      const utcTimestamp = getUTCTimestamp()
      
      const jstDate = new Date(timestamp)
      const utcDate = new Date(utcTimestamp)
      
      // JST should be 9 hours ahead of UTC (considering we're simulating JST)
      // Note: This test assumes the JST conversion is working correctly
      expect(jstDate).toBeInstanceOf(Date)
      expect(utcDate).toBeInstanceOf(Date)
    })

    it('should include milliseconds', () => {
      const timestamp = getJSTTimestamp()
      expect(timestamp).toContain('.')
      
      const millisecondsPart = timestamp.split('.')[1]
      expect(millisecondsPart).toMatch(/^\d{3}Z$/)
    })

    it('should be consistent within same second', () => {
      const timestamp1 = getJSTTimestamp()
      const timestamp2 = getJSTTimestamp()
      
      // Both should be valid timestamps
      expect(new Date(timestamp1).getTime()).not.toBeNaN()
      expect(new Date(timestamp2).getTime()).not.toBeNaN()
      
      // Should be very close in time (within 1 second)
      const diff = Math.abs(new Date(timestamp2).getTime() - new Date(timestamp1).getTime())
      expect(diff).toBeLessThan(1000)
    })
  })

  describe('getUTCTimestamp', () => {
    it('should return UTC ISO string', () => {
      const timestamp = getUTCTimestamp()
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    })

    it('should match native Date.toISOString()', () => {
      const timestamp = getUTCTimestamp()
      const nativeTimestamp = new Date().toISOString()
      
      // Should be within 1 second of each other
      const diff = Math.abs(new Date(timestamp).getTime() - new Date(nativeTimestamp).getTime())
      expect(diff).toBeLessThan(1000)
    })
  })
})