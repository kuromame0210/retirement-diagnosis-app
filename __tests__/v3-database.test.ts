/**
 * V3データベース操作のテスト
 */

// Supabaseクライアントのモック
jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null }))
        })),
        order: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    }))
  }
}))


// タイムスタンプユーティリティのモック
jest.mock('@/lib/utils/timestamp', () => ({
  getJSTTimestamp: () => '2025-06-23T14:00:00.000Z'
}))

import { 
  saveV3DiagnosisData,
  getV3DiagnosisData,
  getV3DiagnosisListForAdmin,
  getV3DiagnosisStats,
  getV3ServiceClickStats
} from '@/lib/v3/database'
import { supabaseAdmin } from '@/lib/supabase'

// Type assertion for mocked supabase
const mockSupabaseAdmin = supabaseAdmin as jest.Mocked<typeof supabaseAdmin>

describe('V3 Database Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('saveV3DiagnosisData', () => {
    const mockSessionData = {
      sessionId: 'v3_test_session',
      userId: 'user_test_123',
      version: 'v3',
      currentStep: 5,
      totalQuestions: 10,
      completedQuestions: 4,
      isCompleted: false,
      textAnswers: {
        'q1_current_feeling': {
          questionId: 'q1_current_feeling',
          question: 'テスト質問',
          answer: 'テスト回答',
          answeredAt: '2025-06-23T14:00:00.000Z',
          characterCount: 4
        }
      },
      partialDiagnosisHistory: [],
      clickedServices: [],
      startedAt: '2025-06-23T14:00:00.000Z',
      updatedAt: '2025-06-23T14:00:00.000Z'
    }

    it('should save new diagnosis data with insert', async () => {
      // 既存データなしをシミュレート
      mockSupabaseAdmin.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' } // データが見つからない
      })

      // insert成功をシミュレート
      mockSupabaseAdmin.from().insert.mockResolvedValueOnce({
        data: [{ session_id: 'v3_test_session' }],
        error: null
      })

      const result = await saveV3DiagnosisData(mockSessionData, 'progress_update')

      expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('career_user_diagnosis_v3')
      expect(mockSupabaseAdmin.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          session_id: 'v3_test_session',
          user_id: 'user_test_123',
          version: 'v3',
          completed_questions: 4,
          total_questions: 10,
          is_completed: false
        })
      )
      expect(result.success).toBe(true)
    })

    it('should update existing diagnosis data', async () => {
      // 既存データありをシミュレート
      mockSupabaseAdmin.from().select().eq().single.mockResolvedValueOnce({
        data: { session_id: 'v3_test_session' },
        error: null
      })

      // update成功をシミュレート
      mockSupabaseAdmin.from().update().eq.mockResolvedValueOnce({
        data: [{ session_id: 'v3_test_session' }],
        error: null
      })

      const result = await saveV3DiagnosisData(mockSessionData, 'partial_diagnosis')

      expect(mockSupabaseAdmin.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          completed_questions: 4,
          is_completed: false,
          updated_at: expect.any(String)
        })
      )
      expect(result.success).toBe(true)
    })

    it('should handle database errors', async () => {
      // データベースエラーをシミュレート
      mockSupabaseAdmin.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection error' }
      })

      const result = await saveV3DiagnosisData(mockSessionData, 'progress_update')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Database connection error')
    })

    it('should mark as completed when final diagnosis', async () => {
      const completedSession = {
        ...mockSessionData,
        isCompleted: true,
        completedQuestions: 10,
        finalResult: {
          resultType: '転職積極型',
          summary: '総合分析結果'
        }
      }

      mockSupabaseAdmin.from().select().eq().single.mockResolvedValueOnce({
        data: { session_id: 'v3_test_session' },
        error: null
      })

      mockSupabaseAdmin.from().update().eq.mockResolvedValueOnce({
        data: [{ session_id: 'v3_test_session' }],
        error: null
      })

      const result = await saveV3DiagnosisData(completedSession, 'final_completed')

      expect(mockSupabaseAdmin.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_completed: true,
          completed_questions: 10,
          final_result: expect.objectContaining({
            resultType: '転職積極型'
          }),
          completed_at: expect.any(String)
        })
      )
      expect(result.success).toBe(true)
    })
  })

  describe('getV3DiagnosisData', () => {
    it('should retrieve diagnosis data by session ID', async () => {
      const mockData = {
        session_id: 'v3_test_session',
        user_id: 'user_test',
        completed_questions: 5,
        text_answers: {},
        partial_results: [],
        final_result: null
      }

      mockSupabaseAdmin.from().select().eq().single.mockResolvedValueOnce({
        data: mockData,
        error: null
      })

      const result = await getV3DiagnosisData('v3_test_session')

      expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('career_user_diagnosis_v3')
      expect(result).toEqual(mockData)
    })

    it('should handle not found case', async () => {
      mockSupabaseAdmin.from().select().eq().single.mockResolvedValueOnceOn({
        data: null,
        error: { code: 'PGRST116' }
      })

      await expect(getV3DiagnosisData('nonexistent_session'))
        .rejects.toThrow('V3診断データが見つかりません')
    })
  })

  describe('getV3DiagnosisListForAdmin', () => {
    it('should retrieve diagnosis list with correct format', async () => {
      const mockData = [
        {
          session_id: 'v3_session_1',
          user_id: 'user_1',
          completed_questions: 8,
          total_questions: 10,
          is_completed: false,
          partial_results: [{ resultType: '転職検討型' }],
          updated_at: '2025-06-23T14:00:00.000Z'
        }
      ]

      mockSupabaseAdmin.from().select().order().limit.mockResolvedValueOnce({
        data: mockData,
        error: null
      })

      const result = await getV3DiagnosisListForAdmin(10)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockData)
      expect(mockSupabaseAdmin.from().select().order).toHaveBeenCalledWith('updated_at', { ascending: false })
    })
  })

  describe('getV3DiagnosisStats', () => {
    it('should calculate correct statistics', async () => {
      const mockData = [
        { 
          is_completed: true, 
          completed_questions: 10,
          partial_results: [{ resultType: '転職積極型' }]
        },
        { 
          is_completed: false, 
          completed_questions: 6,
          partial_results: []
        },
        { 
          is_completed: true, 
          completed_questions: 10,
          partial_results: [{ resultType: '現状維持型' }, { resultType: '転職検討型' }]
        }
      ]

      mockSupabaseAdmin.from().select().mockResolvedValueOnce({
        data: mockData,
        error: null
      })

      const stats = await getV3DiagnosisStats()

      expect(stats.totalDiagnoses).toBe(3)
      expect(stats.completedDiagnoses).toBe(2)
      expect(stats.completionRate).toBe(67) // 2/3 * 100
      expect(stats.averageQuestions).toBe(9) // (10+6+10)/3
      expect(stats.partialDiagnosisUsage).toBe(67) // 2/3 * 100 (2件が途中診断を使用)
    })

    it('should handle empty data', async () => {
      mockSupabaseAdmin.from().select().mockResolvedValueOnce({
        data: [],
        error: null
      })

      const stats = await getV3DiagnosisStats()

      expect(stats.totalDiagnoses).toBe(0)
      expect(stats.completedDiagnoses).toBe(0)
      expect(stats.completionRate).toBe(0)
      expect(stats.averageQuestions).toBe(0)
      expect(stats.partialDiagnosisUsage).toBe(0)
    })
  })

  describe('getV3ServiceClickStats', () => {
    it('should aggregate service click statistics', async () => {
      const mockData = [
        {
          clicked_services: [
            { serviceName: 'サービスA', clickedAt: '2025-06-23T14:00:00.000Z' },
            { serviceName: 'サービスB', clickedAt: '2025-06-23T13:00:00.000Z' }
          ]
        },
        {
          clicked_services: [
            { serviceName: 'サービスA', clickedAt: '2025-06-23T15:00:00.000Z' }
          ]
        }
      ]

      mockSupabaseAdmin.from().select().mockResolvedValueOnce({
        data: mockData,
        error: null
      })

      const stats = await getV3ServiceClickStats()

      expect(stats).toHaveLength(2)
      
      const serviceAStats = stats.find(s => s.service_name === 'サービスA')
      expect(serviceAStats.click_count).toBe(2)
      expect(serviceAStats.latest_click).toBe('2025-06-23T15:00:00.000Z')

      const serviceBStats = stats.find(s => s.service_name === 'サービスB')
      expect(serviceBStats.click_count).toBe(1)
    })

    it('should handle null clicked_services', async () => {
      const mockData = [
        { clicked_services: null },
        { clicked_services: [] }
      ]

      mockSupabaseAdmin.from().select().mockResolvedValueOnce({
        data: mockData,
        error: null
      })

      const stats = await getV3ServiceClickStats()

      expect(stats).toHaveLength(0)
    })
  })
})