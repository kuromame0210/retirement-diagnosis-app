/**
 * V3サービス推薦エンジンテスト
 * v3ServiceEngine関数とサービス推薦ロジックのテスト
 */

import { v3ServiceEngine, v3ServiceTracker } from '@/lib/v3/serviceRecommendation'

// services.tsのモック
jest.mock('@/lib/services', () => ({
  services: [
    {
      id: 'service-1',
      name: 'テスト転職サービス',
      description: 'テスト用転職支援サービス',
      url: 'https://example.com/service1',
      category: ['転職支援', '正社員'],
      urgencyLevel: ['high'],
      tags: ['転職', 'IT', '正社員'],
      image: '/test-image1.jpg'
    },
    {
      id: 'service-2', 
      name: 'テスト退職代行サービス',
      description: 'テスト用退職代行サービス',
      url: 'https://example.com/service2',
      category: ['退職代行'],
      urgencyLevel: ['high'],
      tags: ['退職代行', '緊急'],
      image: '/test-image2.jpg'
    },
    {
      id: 'service-3',
      name: 'テストスキルアップサービス', 
      description: 'テスト用スキルアップサービス',
      url: 'https://example.com/service3',
      category: ['スキルアップ', 'IT'],
      urgencyLevel: ['medium'],
      tags: ['スキルアップ', 'プログラミング'],
      image: '/test-image3.jpg'
    }
  ]
}))

// Claude APIのモック
global.fetch = jest.fn()

describe('V3サービス推薦エンジンテスト', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('v3ServiceEngine基本動作', () => {
    const testAnswers = {
      'monday_feeling': {
        questionId: 'monday_feeling',
        question: '月曜日の朝の気持ちは？',
        answer: '会社に行くのが憂鬱で、吐き気がするほど嫌だ',
        answeredAt: '2023-01-01T09:00:00+09:00',
        characterCount: 30
      },
      'current_stress': {
        questionId: 'current_stress',
        question: '現在のストレスレベルは？',
        answer: '上司のパワハラがひどく、毎日が地獄のようです',
        answeredAt: '2023-01-01T09:01:00+09:00',
        characterCount: 25
      }
    }

    test('緊急度の高い回答に対して退職代行サービスが推薦される', async () => {
      // Claude APIの成功レスポンスをモック
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{
            text: JSON.stringify([
              {
                serviceId: 'service-2',
                score: 0.95,
                priority: 'urgent',
                timing: 'immediate',
                aiReason: 'パワハラ環境からの緊急脱出が必要です',
                expectedOutcome: '1週間以内に退職手続きが完了します',
                matchFactors: ['パワハラ対応', '緊急性']
              },
              {
                serviceId: 'service-1', 
                score: 0.80,
                priority: 'recommended',
                timing: 'soon',
                aiReason: '転職による環境改善が期待できます',
                expectedOutcome: '3ヶ月以内の転職が可能です',
                matchFactors: ['転職意欲', '経験活用']
              }
            ])
          }]
        })
      })

      const recommendations = await v3ServiceEngine(testAnswers)

      expect(recommendations).toHaveLength(2)
      
      // 1位が退職代行サービス
      expect(recommendations[0].service.id).toBe('service-2')
      expect(recommendations[0].rank).toBe(1)
      expect(recommendations[0].priority).toBe('urgent')
      expect(recommendations[0].score).toBe(0.95)
      expect(recommendations[0].aiReason).toContain('緊急脱出')
      
      // 2位が転職サービス
      expect(recommendations[1].service.id).toBe('service-1')
      expect(recommendations[1].rank).toBe(2)
      expect(recommendations[1].priority).toBe('recommended')
    })

    test('スキル向上志向の回答にスキルアップサービスが推薦される', async () => {
      const skillAnswers = {
        'career_goal': {
          questionId: 'career_goal',
          question: 'キャリア目標は？',
          answer: 'プログラミングスキルを向上させて、より良い条件で転職したい',
          answeredAt: '2023-01-01T09:00:00+09:00',
          characterCount: 40
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{
            text: JSON.stringify([
              {
                serviceId: 'service-3',
                score: 0.88,
                priority: 'recommended',
                timing: 'soon',
                aiReason: 'スキル向上によってキャリアアップが実現できます',
                expectedOutcome: '6ヶ月でプログラミングスキルが大幅向上',
                matchFactors: ['スキル向上意欲', '学習時間']
              }
            ])
          }]
        })
      })

      const recommendations = await v3ServiceEngine(skillAnswers)

      expect(recommendations).toHaveLength(1)
      expect(recommendations[0].service.id).toBe('service-3')
      expect(recommendations[0].service.name).toBe('テストスキルアップサービス')
      expect(recommendations[0].aiReason).toContain('スキル向上')
    })

    test('Claude API失敗時にフォールバック推薦が動作する', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'))

      const recommendations = await v3ServiceEngine(testAnswers)

      expect(recommendations).toHaveLength(3) // フォールバックでランダム推薦
      expect(recommendations[0].rank).toBe(1)
      expect(recommendations[1].rank).toBe(2)
      expect(recommendations[2].rank).toBe(3)
      
      // フォールバック時の最低スコア確認
      recommendations.forEach(rec => {
        expect(rec.score).toBeGreaterThanOrEqual(0.5)
        expect(rec.score).toBeLessThanOrEqual(1.0)
      })
    })

    test('無効なClaude APIレスポンスでフォールバックが動作する', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{
            text: 'invalid json response'
          }]
        })
      })

      const recommendations = await v3ServiceEngine(testAnswers)

      expect(recommendations).toHaveLength(3) // フォールバック推薦
      expect(recommendations[0].aiReason).toContain('基本推奨')
    })
  })

  describe('v3ServiceTracker動作', () => {
    test('サービスクリック追跡が正常に動作する', () => {
      const mockRecommendation = {
        service: { id: 'service-1', name: 'テスト転職サービス' },
        rank: 1,
        score: 0.95
      }

      // sessionStorageのモック
      const mockStorage: { [key: string]: string } = {}
      Object.defineProperty(window, 'sessionStorage', {
        value: {
          getItem: jest.fn((key) => mockStorage[key] || null),
          setItem: jest.fn((key, value) => {
            mockStorage[key] = value
          }),
          clear: jest.fn()
        }
      })

      v3ServiceTracker('click', mockRecommendation, {
        diagnosisStage: 'final',
        resultType: '要注意型'
      })

      expect(window.sessionStorage.setItem).toHaveBeenCalled()
    })
  })

  describe('エラーハンドリング', () => {
    test('空の回答でも基本推薦が動作する', async () => {
      const emptyAnswers = {}

      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('No answers'))

      const recommendations = await v3ServiceEngine(emptyAnswers)

      expect(recommendations).toHaveLength(3)
      expect(recommendations[0].aiReason).toContain('基本推奨')
    })

    test('ネットワークエラー時のリトライ処理', async () => {
      ;(global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            content: [{
              text: JSON.stringify([{
                serviceId: 'service-1',
                score: 0.8,
                priority: 'recommended',
                timing: 'soon',
                aiReason: 'リトライ成功',
                expectedOutcome: '成功',
                matchFactors: ['リトライ']
              }])
            }]
          })
        })

      const testAnswers = {
        'test': {
          questionId: 'test',
          question: 'テスト',
          answer: 'テスト回答',
          answeredAt: '2023-01-01T09:00:00+09:00',
          characterCount: 5
        }
      }

      const recommendations = await v3ServiceEngine(testAnswers)

      expect(global.fetch).toHaveBeenCalledTimes(2) // 初回失敗 + リトライ成功
      expect(recommendations[0].aiReason).toBe('リトライ成功')
    })
  })

  describe('レスポンス形式検証', () => {
    test('推薦結果の必須フィールドが含まれている', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{
            text: JSON.stringify([{
              serviceId: 'service-1',
              score: 0.85,
              priority: 'recommended',
              timing: 'soon',
              aiReason: 'テスト理由',
              expectedOutcome: 'テスト結果',
              matchFactors: ['要因1', '要因2']
            }])
          }]
        })
      })

      const testAnswers = {
        'test': {
          questionId: 'test',
          question: 'テスト質問',
          answer: 'テスト回答',
          answeredAt: '2023-01-01T09:00:00+09:00',
          characterCount: 5
        }
      }

      const recommendations = await v3ServiceEngine(testAnswers)
      const rec = recommendations[0]

      // 必須フィールドの確認
      expect(rec).toHaveProperty('service')
      expect(rec).toHaveProperty('rank')
      expect(rec).toHaveProperty('score')
      expect(rec).toHaveProperty('priority')
      expect(rec).toHaveProperty('timing')
      expect(rec).toHaveProperty('aiReason')
      expect(rec).toHaveProperty('expectedOutcome')
      expect(rec).toHaveProperty('matchFactors')

      // サービス情報の確認
      expect(rec.service).toHaveProperty('id')
      expect(rec.service).toHaveProperty('name')
      expect(rec.service).toHaveProperty('description')
      expect(rec.service).toHaveProperty('url')

      // 値の型確認
      expect(typeof rec.rank).toBe('number')
      expect(typeof rec.score).toBe('number')
      expect(typeof rec.aiReason).toBe('string')
      expect(Array.isArray(rec.matchFactors)).toBe(true)
    })

    test('スコアの範囲が正しい（0.0-1.0）', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{
            text: JSON.stringify([
              { serviceId: 'service-1', score: 0.95, priority: 'urgent', timing: 'immediate', aiReason: '理由1', expectedOutcome: '結果1', matchFactors: [] },
              { serviceId: 'service-2', score: 0.85, priority: 'recommended', timing: 'soon', aiReason: '理由2', expectedOutcome: '結果2', matchFactors: [] },
              { serviceId: 'service-3', score: 0.75, priority: 'consider', timing: 'later', aiReason: '理由3', expectedOutcome: '結果3', matchFactors: [] }
            ])
          }]
        })
      })

      const recommendations = await v3ServiceEngine({ test: { questionId: 'test', question: 'test', answer: 'test', answeredAt: '2023-01-01', characterCount: 4 } })

      recommendations.forEach(rec => {
        expect(rec.score).toBeGreaterThanOrEqual(0.0)
        expect(rec.score).toBeLessThanOrEqual(1.0)
      })
    })

    test('ランキングが正しく割り当てられる', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{
            text: JSON.stringify([
              { serviceId: 'service-2', score: 0.85, priority: 'recommended', timing: 'soon', aiReason: '理由', expectedOutcome: '結果', matchFactors: [] },
              { serviceId: 'service-1', score: 0.95, priority: 'urgent', timing: 'immediate', aiReason: '理由', expectedOutcome: '結果', matchFactors: [] },
              { serviceId: 'service-3', score: 0.75, priority: 'consider', timing: 'later', aiReason: '理由', expectedOutcome: '結果', matchFactors: [] }
            ])
          }]
        })
      })

      const recommendations = await v3ServiceEngine({ test: { questionId: 'test', question: 'test', answer: 'test', answeredAt: '2023-01-01', characterCount: 4 } })

      // スコア順にソートされてランクが付与される
      expect(recommendations[0].rank).toBe(1)
      expect(recommendations[0].score).toBe(0.95) // 最高スコア
      expect(recommendations[1].rank).toBe(2)
      expect(recommendations[1].score).toBe(0.85)
      expect(recommendations[2].rank).toBe(3)
      expect(recommendations[2].score).toBe(0.75) // 最低スコア
    })
  })
})