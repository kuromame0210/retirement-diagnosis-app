/**
 * V3セッション管理システムのテスト
 */

// localStorageのモック
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}

// sessionStorageのモック  
const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}

// グローバルstorageをモック
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage
})

// crypto.randomUUID のモック
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'mock-uuid-' + Math.random().toString(36).substring(7)),
  },
})

describe('V3セッション管理', () => {
  let sessionModule: any

  beforeAll(async () => {
    // V3セッション管理モジュールを動的インポート
    sessionModule = await import('@/lib/v3/session')
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockSessionStorage.getItem.mockReturnValue(null)
    mockLocalStorage.getItem.mockReturnValue(null)
  })

  describe('新規セッション作成', () => {
    it('should create new V3 session with default values', () => {
      const session = sessionModule.createV3Session()

      expect(session.sessionId).toBeDefined()
      expect(session.sessionId).toMatch(/^v3_/)
      expect(session.version).toBe('v3')
      expect(session.currentStep).toBe(1)
      expect(session.totalQuestions).toBe(10)
      expect(session.completedQuestions).toBe(0)
      expect(session.isCompleted).toBe(false)
      expect(session.textAnswers).toEqual({})
      expect(session.partialDiagnosisHistory).toEqual([])
      expect(session.clickedServices).toEqual([])
      expect(session.startedAt).toBeDefined()
      expect(session.updatedAt).toBeDefined()
    })

    it('should create session with custom userId', () => {
      const customUserId = 'user_12345'
      const session = sessionModule.createV3Session(customUserId)

      expect(session.userId).toBe(customUserId)
      expect(session.sessionId).toMatch(/^v3_/)
    })

    it('should save new session to sessionStorage', () => {
      const session = sessionModule.createV3Session()

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'career_diagnosis_v3_session',
        JSON.stringify(session)
      )
    })
  })

  describe('セッション取得', () => {
    it('should return existing session from sessionStorage', () => {
      const existingSession = {
        sessionId: 'v3_existing_session',
        userId: 'user_123',
        version: 'v3',
        currentStep: 5,
        totalQuestions: 10,
        completedQuestions: 4,
        isCompleted: false,
        textAnswers: {
          'q1_text': {
            questionId: 'q1_text',
            answer: 'テスト回答',
            answeredAt: '2025-06-29T10:00:00.000Z',
            characterCount: 5
          }
        },
        partialDiagnosisHistory: [],
        clickedServices: [],
        startedAt: '2025-06-29T09:00:00.000Z',
        updatedAt: '2025-06-29T10:00:00.000Z'
      }

      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(existingSession))

      const session = sessionModule.getV3Session()

      expect(session).toEqual(existingSession)
      expect(mockSessionStorage.getItem).toHaveBeenCalledWith('career_diagnosis_v3_session')
    })

    it('should create new session if none exists', () => {
      mockSessionStorage.getItem.mockReturnValue(null)

      const session = sessionModule.getV3Session()

      expect(session.sessionId).toBeDefined()
      expect(session.version).toBe('v3')
      expect(session.currentStep).toBe(1)
      expect(session.completedQuestions).toBe(0)
    })

    it('should handle corrupted session data', () => {
      mockSessionStorage.getItem.mockReturnValue('invalid json data')

      const session = sessionModule.getV3Session()

      // 新しいセッションが作成されるべき
      expect(session.sessionId).toBeDefined()
      expect(session.version).toBe('v3')
      expect(session.currentStep).toBe(1)
    })
  })

  describe('セッション保存', () => {
    it('should save session updates correctly', () => {
      const session = {
        sessionId: 'v3_test_session',
        userId: 'user_123',
        version: 'v3',
        currentStep: 3,
        totalQuestions: 10,
        completedQuestions: 2,
        isCompleted: false,
        textAnswers: {
          'q1_text': {
            questionId: 'q1_text',
            answer: 'テスト回答1',
            answeredAt: '2025-06-29T10:00:00.000Z',
            characterCount: 6
          },
          'q2_text': {
            questionId: 'q2_text',
            answer: 'テスト回答2',
            answeredAt: '2025-06-29T10:05:00.000Z',
            characterCount: 6
          }
        },
        partialDiagnosisHistory: [],
        clickedServices: [],
        startedAt: '2025-06-29T09:00:00.000Z',
        updatedAt: '2025-06-29T10:05:00.000Z'
      }

      sessionModule.saveV3Session(session)

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'career_diagnosis_v3_session',
        JSON.stringify(session)
      )
    })

    it('should update timestamp on save', () => {
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2025-06-29T11:00:00.000Z')

      const session = {
        sessionId: 'v3_test_session',
        updatedAt: '2025-06-29T10:00:00.000Z'
      }

      sessionModule.saveV3Session(session)

      const savedSessionData = JSON.parse(mockSessionStorage.setItem.mock.calls[0][1])
      expect(savedSessionData.updatedAt).toBe('2025-06-29T11:00:00.000Z')

      jest.restoreAllMocks()
    })
  })

  describe('回答の追加', () => {
    it('should add text answer correctly', () => {
      const initialSession = {
        sessionId: 'v3_test_session',
        currentStep: 1,
        completedQuestions: 0,
        textAnswers: {},
        updatedAt: '2025-06-29T09:00:00.000Z'
      }

      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(initialSession))

      sessionModule.addV3TextAnswer('q1_text', 'これは質問1の回答です。')

      expect(mockSessionStorage.setItem).toHaveBeenCalled()
      const savedData = JSON.parse(mockSessionStorage.setItem.mock.calls[0][1])
      
      expect(savedData.textAnswers['q1_text']).toBeDefined()
      expect(savedData.textAnswers['q1_text'].questionId).toBe('q1_text')
      expect(savedData.textAnswers['q1_text'].answer).toBe('これは質問1の回答です。')
      expect(savedData.textAnswers['q1_text'].characterCount).toBe(13)
      expect(savedData.textAnswers['q1_text'].answeredAt).toBeDefined()
      expect(savedData.completedQuestions).toBe(1)
    })

    it('should update existing answer', () => {
      const sessionWithAnswer = {
        sessionId: 'v3_test_session',
        currentStep: 2,
        completedQuestions: 1,
        textAnswers: {
          'q1_text': {
            questionId: 'q1_text',
            answer: '古い回答',
            answeredAt: '2025-06-29T09:00:00.000Z',
            characterCount: 4
          }
        }
      }

      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(sessionWithAnswer))

      sessionModule.addV3TextAnswer('q1_text', '新しい回答に更新しました。')

      const savedData = JSON.parse(mockSessionStorage.setItem.mock.calls[0][1])
      
      expect(savedData.textAnswers['q1_text'].answer).toBe('新しい回答に更新しました。')
      expect(savedData.textAnswers['q1_text'].characterCount).toBe(14)
      expect(savedData.completedQuestions).toBe(1) // 既存回答の更新なので増加しない
    })

    it('should handle empty answers', () => {
      const initialSession = {
        sessionId: 'v3_test_session',
        currentStep: 1,
        completedQuestions: 0,
        textAnswers: {}
      }

      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(initialSession))

      sessionModule.addV3TextAnswer('q1_text', '')

      const savedData = JSON.parse(mockSessionStorage.setItem.mock.calls[0][1])
      
      expect(savedData.textAnswers['q1_text'].answer).toBe('')
      expect(savedData.textAnswers['q1_text'].characterCount).toBe(0)
      expect(savedData.completedQuestions).toBe(0) // 空回答は完了数に含めない
    })
  })

  describe('進行状況の取得', () => {
    it('should calculate progress info correctly', () => {
      const sessionWithProgress = {
        sessionId: 'v3_test_session',
        currentStep: 6,
        totalQuestions: 10,
        completedQuestions: 5,
        isCompleted: false,
        textAnswers: {
          'q1_text': { answer: '回答1' },
          'q2_text': { answer: '回答2' },
          'q3_text': { answer: '回答3' },
          'q4_text': { answer: '回答4' },
          'q5_text': { answer: '回答5' }
        },
        partialDiagnosisHistory: [],
        finalResult: null
      }

      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(sessionWithProgress))

      const progressInfo = sessionModule.getV3ProgressInfo()

      expect(progressInfo.currentStep).toBe(6)
      expect(progressInfo.completedQuestions).toBe(5)
      expect(progressInfo.totalQuestions).toBe(10)
      expect(progressInfo.progressPercentage).toBe(50)
      expect(progressInfo.isCompleted).toBe(false)
      expect(progressInfo.canDiagnose).toBe(true) // 1問以上回答済み
      expect(progressInfo.hasPartialDiagnosis).toBe(false)
      expect(progressInfo.hasFinalResult).toBe(false)
    })

    it('should detect partial diagnosis capability', () => {
      const sessionWithFewAnswers = {
        sessionId: 'v3_test_session',
        currentStep: 2,
        totalQuestions: 10,
        completedQuestions: 1,
        textAnswers: {
          'q1_text': { answer: '1つだけの回答' }
        },
        partialDiagnosisHistory: [],
        finalResult: null
      }

      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(sessionWithFewAnswers))

      const progressInfo = sessionModule.getV3ProgressInfo()

      expect(progressInfo.canDiagnose).toBe(true)
      expect(progressInfo.progressPercentage).toBe(10)
    })

    it('should handle completed session', () => {
      const completedSession = {
        sessionId: 'v3_test_session',
        currentStep: 11,
        totalQuestions: 10,
        completedQuestions: 10,
        isCompleted: true,
        textAnswers: Object.fromEntries(
          Array.from({ length: 10 }, (_, i) => [`q${i + 1}_text`, { answer: `回答${i + 1}` }])
        ),
        partialDiagnosisHistory: [{ step: 3 }, { step: 6 }],
        finalResult: { type: '転職推奨型' }
      }

      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(completedSession))

      const progressInfo = sessionModule.getV3ProgressInfo()

      expect(progressInfo.isCompleted).toBe(true)
      expect(progressInfo.progressPercentage).toBe(100)
      expect(progressInfo.hasPartialDiagnosis).toBe(true)
      expect(progressInfo.hasFinalResult).toBe(true)
    })
  })

  describe('セッションのクリア', () => {
    it('should clear session from storage', () => {
      sessionModule.clearV3Session()

      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('career_diagnosis_v3_session')
    })

    it('should clear partial diagnosis history', () => {
      const sessionWithHistory = {
        sessionId: 'v3_test_session',
        partialDiagnosisHistory: [
          { step: 3, result: 'partial_result_1' },
          { step: 6, result: 'partial_result_2' }
        ]
      }

      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(sessionWithHistory))

      sessionModule.clearV3PartialHistory()

      const savedData = JSON.parse(mockSessionStorage.setItem.mock.calls[0][1])
      expect(savedData.partialDiagnosisHistory).toEqual([])
    })
  })

  describe('サービスクリック追跡', () => {
    it('should track service clicks', () => {
      const session = {
        sessionId: 'v3_test_session',
        clickedServices: []
      }

      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(session))

      sessionModule.trackV3ServiceClick('転職エージェント', 'agent_service_1')

      const savedData = JSON.parse(mockSessionStorage.setItem.mock.calls[0][1])
      
      expect(savedData.clickedServices).toHaveLength(1)
      expect(savedData.clickedServices[0].serviceCategory).toBe('転職エージェント')
      expect(savedData.clickedServices[0].serviceId).toBe('agent_service_1')
      expect(savedData.clickedServices[0].clickedAt).toBeDefined()
    })

    it('should prevent duplicate service clicks', () => {
      const sessionWithClick = {
        sessionId: 'v3_test_session',
        clickedServices: [{
          serviceCategory: '転職エージェント',
          serviceId: 'agent_service_1',
          clickedAt: '2025-06-29T10:00:00.000Z'
        }]
      }

      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(sessionWithClick))

      sessionModule.trackV3ServiceClick('転職エージェント', 'agent_service_1')

      const savedData = JSON.parse(mockSessionStorage.setItem.mock.calls[0][1])
      
      // 重複クリックは追加されない
      expect(savedData.clickedServices).toHaveLength(1)
    })
  })

  describe('エラーハンドリング', () => {
    it('should handle sessionStorage errors gracefully', () => {
      mockSessionStorage.getItem.mockImplementation(() => {
        throw new Error('Storage not available')
      })

      // エラーが発生しても新しいセッションが作成されるべき
      const session = sessionModule.getV3Session()

      expect(session.sessionId).toBeDefined()
      expect(session.version).toBe('v3')
    })

    it('should handle setItem errors gracefully', () => {
      mockSessionStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })

      const session = {
        sessionId: 'v3_test_session',
        version: 'v3'
      }

      // エラーが発生してもクラッシュしないべき
      expect(() => {
        sessionModule.saveV3Session(session)
      }).not.toThrow()
    })
  })
})