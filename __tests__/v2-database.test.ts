/**
 * V2診断データベース保存機能のテスト
 */

// モック設定
jest.mock('../lib/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}))

import { saveV2DiagnosisData } from '../lib/v2/database'

// sessionStorageのモック
const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
})

// fetchのモック
global.fetch = jest.fn()

describe('V2 Database Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSessionStorage.getItem.mockClear()
    mockSessionStorage.setItem.mockClear()
  })

  describe('saveV2DiagnosisData', () => {
    it('should save V2 diagnosis data successfully', async () => {
      // セッションIDのモック（実際に使われるキー名に合わせる）
      mockSessionStorage.getItem.mockImplementation((key) => {
        if (key === 'v2_session_id') return 'test-session-id'
        return null
      })

      // fetchの成功レスポンスモック
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          id: 'test-session-id',
          message: '保存成功'
        })
      })

      const testData = {
        answers: {
          satisfaction: 'heavy',
          night_thoughts: 'escape_thoughts'
        },
        result: {
          type: '転職検討型',
          urgency: 'medium',
          summary: 'テスト診断結果'
        },
        updateType: 'result_completed' as const
      }

      const result = await saveV2DiagnosisData(testData)

      expect(result.success).toBe(true)
      expect(result.id).toBe('test-session-id')
      expect(fetch).toHaveBeenCalledWith('/api/save-v2-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('test-session-id')
      })
    })

    it('should handle save failure with retry', async () => {
      mockSessionStorage.getItem.mockReturnValue('test-session-id')

      // 最初は失敗、リトライで成功
      ;(global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            id: 'test-session-id'
          })
        })

      const testData = {
        answers: { satisfaction: 'heavy' },
        updateType: 'diagnosis_completed' as const
      }

      const result = await saveV2DiagnosisData(testData)

      expect(result.success).toBe(true)
      expect(fetch).toHaveBeenCalledTimes(2) // リトライが実行される
    })

    it('should generate new session ID if none exists', async () => {
      mockSessionStorage.getItem.mockImplementation(() => null)

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          id: expect.any(String)
        })
      })

      const testData = {
        answers: { satisfaction: 'neutral' }
      }

      const result = await saveV2DiagnosisData(testData)

      expect(result.success).toBe(true)
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'v2_session_id',
        expect.any(String)
      )
    })

    it('should include clicked services in save data', async () => {
      mockSessionStorage.getItem.mockImplementation((key) => {
        if (key === 'v2_session_id') return 'test-session-id'
        return null
      })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, id: 'test-session-id' })
      })

      const testData = {
        clickedServices: [
          { id: 'service-1', name: 'Test Service', url: 'https://example.com' }
        ]
      }

      await saveV2DiagnosisData(testData)

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0]
      const requestBody = JSON.parse(fetchCall[1].body)
      
      expect(requestBody.clickedServices).toEqual(testData.clickedServices)
    })
  })
})