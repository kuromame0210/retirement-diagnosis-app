/**
 * V3セッション管理のテスト
 */

// タイムスタンプユーティリティのモック
jest.mock('../lib/utils/timestamp', () => ({
  getJSTTimestamp: () => '2025-06-23T14:00:00.000Z'
}))

// UUIDのモック
const mockUuid = 'v3_1719144000000_abc123'
jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => mockUuid)
}))

import { 
  getV3Session, 
  addV3Answer, 
  addV3PartialResult,
  setV3FinalResult,
  addV3ClickedService,
  clearV3Session 
} from '../lib/v3/session'

// sessionStorageのモック
const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
})

// fetchのモック
global.fetch = jest.fn()

describe('V3 Session Management', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSessionStorage.getItem.mockClear()
    mockSessionStorage.setItem.mockClear()
    mockSessionStorage.removeItem.mockClear()
  })

  describe('getV3Session', () => {
    it('should return default session when no stored session exists', () => {
      mockSessionStorage.getItem.mockReturnValue(null)

      const session = getV3Session()

      expect(session).toEqual({
        sessionId: expect.stringContaining('v3_'),
        userId: expect.stringContaining('user_'),
        version: 'v3',
        currentStep: 1,
        totalQuestions: 10,
        completedQuestions: 0,
        isCompleted: false,
        textAnswers: {},
        partialDiagnosisHistory: [],
        clickedServices: [],
        startedAt: '2025-06-23T14:00:00.000Z',
        updatedAt: '2025-06-23T14:00:00.000Z'
      })
    })

    it('should return stored session when it exists', () => {
      const storedSession = {
        sessionId: 'v3_stored_session',
        userId: 'user_stored',
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
            answeredAt: '2025-06-23T13:00:00.000Z',
            characterCount: 4
          }
        },
        partialDiagnosisHistory: [],
        clickedServices: [],
        startedAt: '2025-06-23T13:00:00.000Z',
        updatedAt: '2025-06-23T13:30:00.000Z'
      }

      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(storedSession))

      const session = getV3Session()

      expect(session).toEqual(storedSession)
    })

    it('should handle corrupted session data', () => {
      mockSessionStorage.getItem.mockReturnValue('invalid-json-data')

      const session = getV3Session()

      // 破損データの場合は新しいセッションを作成
      expect(session.sessionId).toBeDefined()
      expect(session.version).toBe('v3')
      expect(session.currentStep).toBe(1)
    })

    it('should handle wrong version session', () => {
      const wrongVersionSession = {
        sessionId: 'v2_session',
        version: 'v2' // 間違ったバージョン
      }

      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(wrongVersionSession))

      const session = getV3Session()

      // 新しいV3セッションを作成
      expect(session.version).toBe('v3')
      expect(session.sessionId).toContain('v3_')
    })
  })

  describe('addV3Answer', () => {
    it('should add answer and update session state', () => {
      // 既存セッション
      const existingSession = {
        sessionId: 'test-session',
        userId: 'test-user',
        version: 'v3',
        currentStep: 1,
        totalQuestions: 10,
        completedQuestions: 0,
        isCompleted: false,
        textAnswers: {},
        partialDiagnosisHistory: [],
        clickedServices: [],
        startedAt: '2025-06-23T13:00:00.000Z',
        updatedAt: '2025-06-23T13:00:00.000Z'
      }

      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(existingSession))

      addV3Answer('q1_current_feeling', '今の仕事について教えてください', 'とても辛いです')

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'v3_diagnosis_session',
        expect.stringContaining('"completedQuestions":1')
      )

      const savedData = JSON.parse(mockSessionStorage.setItem.mock.calls[0][1])
      expect(savedData.textAnswers['q1_current_feeling']).toEqual({
        questionId: 'q1_current_feeling',
        question: '今の仕事について教えてください',
        answer: 'とても辛いです',
        answeredAt: '2025-06-23T14:00:00.000Z',
        characterCount: 7
      })
      expect(savedData.currentStep).toBe(2)
      expect(savedData.isCompleted).toBe(false)
    })

    it('should mark as completed when reaching total questions', () => {
      const nearCompleteSession = {
        sessionId: 'test-session',
        userId: 'test-user',
        version: 'v3',
        currentStep: 10,
        totalQuestions: 10,
        completedQuestions: 9,
        isCompleted: false,
        textAnswers: {
          'q1_test': { answer: 'test1' },
          'q2_test': { answer: 'test2' },
          'q3_test': { answer: 'test3' },
          'q4_test': { answer: 'test4' },
          'q5_test': { answer: 'test5' },
          'q6_test': { answer: 'test6' },
          'q7_test': { answer: 'test7' },
          'q8_test': { answer: 'test8' },
          'q9_test': { answer: 'test9' }
        },
        partialDiagnosisHistory: [],
        clickedServices: [],
        startedAt: '2025-06-23T13:00:00.000Z',
        updatedAt: '2025-06-23T13:00:00.000Z'
      }

      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(nearCompleteSession))

      addV3Answer('q10_action_readiness', '最後の質問', '準備完了です')

      const savedData = JSON.parse(mockSessionStorage.setItem.mock.calls[0][1])
      expect(savedData.completedQuestions).toBe(10)
      expect(savedData.isCompleted).toBe(true)
      expect(savedData.currentStep).toBe(10) // 最大値で停止
    })
  })

  describe('addV3PartialResult', () => {
    it('should add partial diagnosis result to history', () => {
      const existingSession = {
        sessionId: 'test-session',
        userId: 'test-user',
        version: 'v3',
        currentStep: 4,
        totalQuestions: 10,
        completedQuestions: 3,
        isCompleted: false,
        textAnswers: {},
        partialDiagnosisHistory: [],
        clickedServices: [],
        startedAt: '2025-06-23T13:00:00.000Z',
        updatedAt: '2025-06-23T13:00:00.000Z'
      }

      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(existingSession))

      const partialResult = {
        answeredQuestions: 3,
        confidenceLevel: 'low' as const,
        resultType: '転職検討型（暫定）',
        summary: '3問時点での分析結果',
        recommendations: ['詳細分析を継続することを推奨']
      }

      addV3PartialResult(partialResult)

      const savedData = JSON.parse(mockSessionStorage.setItem.mock.calls[0][1])
      expect(savedData.partialDiagnosisHistory).toHaveLength(1)
      expect(savedData.partialDiagnosisHistory[0]).toEqual({
        ...partialResult,
        diagnosedAt: '2025-06-23T14:00:00.000Z'
      })
    })

    it('should accumulate multiple partial results', () => {
      const sessionWithPartialResult = {
        sessionId: 'test-session',
        userId: 'test-user',
        version: 'v3',
        currentStep: 7,
        totalQuestions: 10,
        completedQuestions: 6,
        isCompleted: false,
        textAnswers: {},
        partialDiagnosisHistory: [{
          answeredQuestions: 3,
          confidenceLevel: 'low',
          resultType: '転職検討型（暫定）',
          summary: '最初の分析',
          recommendations: [],
          diagnosedAt: '2025-06-23T13:00:00.000Z'
        }],
        clickedServices: [],
        startedAt: '2025-06-23T13:00:00.000Z',
        updatedAt: '2025-06-23T13:00:00.000Z'
      }

      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(sessionWithPartialResult))

      const secondPartialResult = {
        answeredQuestions: 6,
        confidenceLevel: 'medium' as const,
        resultType: '転職検討型',
        summary: '6問時点での詳細分析',
        recommendations: ['具体的な転職準備を開始']
      }

      addV3PartialResult(secondPartialResult)

      const savedData = JSON.parse(mockSessionStorage.setItem.mock.calls[0][1])
      expect(savedData.partialDiagnosisHistory).toHaveLength(2)
      expect(savedData.partialDiagnosisHistory[1].answeredQuestions).toBe(6)
    })
  })

  describe('setV3FinalResult', () => {
    it('should set final result and mark as completed', () => {
      const existingSession = {
        sessionId: 'test-session',
        userId: 'test-user',
        version: 'v3',
        currentStep: 10,
        totalQuestions: 10,
        completedQuestions: 10,
        isCompleted: true,
        textAnswers: {},
        partialDiagnosisHistory: [],
        clickedServices: [],
        startedAt: '2025-06-23T13:00:00.000Z',
        updatedAt: '2025-06-23T13:30:00.000Z'
      }

      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(existingSession))

      const finalResult = {
        resultType: '転職積極型',
        confidenceLevel: 'high' as const,
        urgencyLevel: 'medium' as const,
        summary: '最終的な総合分析結果',
        detailedAnalysis: {
          emotionalState: { current_level: 'ストレス高' },
          careerGoals: { clarity_level: '明確' }
        },
        actionPlan: ['すぐに転職活動を開始', '履歴書を更新'],
        serviceRecommendations: []
      }

      setV3FinalResult(finalResult)

      const savedData = JSON.parse(mockSessionStorage.setItem.mock.calls[0][1])
      expect(savedData.finalResult).toEqual({
        ...finalResult,
        diagnosedAt: '2025-06-23T14:00:00.000Z'
      })
      expect(savedData.completedAt).toBe('2025-06-23T14:00:00.000Z')
      expect(savedData.isCompleted).toBe(true)
    })
  })

  describe('addV3ClickedService', () => {
    it('should add service click to history', () => {
      const existingSession = {
        sessionId: 'test-session',
        userId: 'test-user',
        version: 'v3',
        currentStep: 1,
        totalQuestions: 10,
        completedQuestions: 0,
        isCompleted: false,
        textAnswers: {},
        partialDiagnosisHistory: [],
        clickedServices: [],
        startedAt: '2025-06-23T13:00:00.000Z',
        updatedAt: '2025-06-23T13:00:00.000Z'
      }

      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(existingSession))

      addV3ClickedService(
        'service-001',
        '転職エージェントA',
        'https://example.com',
        'partial_3',
        '転職検討型（暫定）'
      )

      const savedData = JSON.parse(mockSessionStorage.setItem.mock.calls[0][1])
      expect(savedData.clickedServices).toHaveLength(1)
      expect(savedData.clickedServices[0]).toEqual({
        serviceId: 'service-001',
        serviceName: '転職エージェントA',
        serviceUrl: 'https://example.com',
        clickedAt: '2025-06-23T14:00:00.000Z',
        diagnosisStage: 'partial_3',
        resultTypeWhenClicked: '転職検討型（暫定）'
      })
    })

    it('should allow multiple clicks for same service', () => {
      const sessionWithClick = {
        sessionId: 'test-session',
        userId: 'test-user',
        version: 'v3',
        currentStep: 1,
        totalQuestions: 10,
        completedQuestions: 0,
        isCompleted: false,
        textAnswers: {},
        partialDiagnosisHistory: [],
        clickedServices: [{
          serviceId: 'service-001',
          serviceName: '転職エージェントA',
          serviceUrl: 'https://example.com',
          clickedAt: '2025-06-23T13:00:00.000Z',
          diagnosisStage: 'partial_3'
        }],
        startedAt: '2025-06-23T13:00:00.000Z',
        updatedAt: '2025-06-23T13:00:00.000Z'
      }

      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(sessionWithClick))

      // 同じサービスを再度クリック
      addV3ClickedService('service-001', '転職エージェントA', 'https://example.com', 'final')

      const savedData = JSON.parse(mockSessionStorage.setItem.mock.calls[0][1])
      expect(savedData.clickedServices).toHaveLength(2) // 重複許可
    })
  })

  describe('clearV3Session', () => {
    it('should remove session from storage', () => {
      clearV3Session()

      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('v3_diagnosis_session')
    })
  })
})