/**
 * V2セッション管理のテスト
 */

// タイムスタンプユーティリティのモック
jest.mock('../lib/utils/timestamp', () => ({
  getJSTTimestamp: () => '2025-06-14T14:00:00.000Z'
}))

import { getV2Session, saveV2Session, addV2ClickedService } from '../lib/v2/session'

// sessionStorageのモック
const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
})

// UUIDのモック
jest.mock('crypto', () => ({
  randomUUID: () => 'mock-uuid-123'
}))

describe('V2 Session Management', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSessionStorage.getItem.mockClear()
    mockSessionStorage.setItem.mockClear()
  })

  describe('getV2Session', () => {
    it('should return default session when no stored session exists', () => {
      mockSessionStorage.getItem.mockReturnValue(null)

      const session = getV2Session()

      expect(session).toEqual({
        sessionId: expect.any(String),
        userId: expect.any(String),
        currentStep: 1,
        answers: {},
        freeText: '',
        clickedServices: [],
        startedAt: '2025-06-14T14:00:00.000Z',
        updatedAt: '2025-06-14T14:00:00.000Z'
      })
    })

    it('should return stored session when it exists', () => {
      const storedSession = {
        sessionId: 'stored-session-id',
        userId: 'stored-user-id',
        currentStep: 3,
        answers: { satisfaction: 'heavy' },
        freeText: 'test text',
        clickedServices: [],
        startedAt: '2025-06-14T13:00:00.000Z',
        updatedAt: '2025-06-14T13:30:00.000Z'
      }

      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(storedSession))

      const session = getV2Session()

      expect(session).toEqual(storedSession)
    })

    it('should handle corrupted session data', () => {
      mockSessionStorage.getItem.mockReturnValue('invalid-json')

      const session = getV2Session()

      // 破損データの場合は新しいセッションを作成
      expect(session.sessionId).toBeDefined()
      expect(session.currentStep).toBe(1)
    })
  })

  describe('saveV2Session', () => {
    it('should save session with updated timestamp', () => {
      const existingSession = {
        sessionId: 'test-session',
        userId: 'test-user',
        currentStep: 1,
        answers: {},
        freeText: '',
        clickedServices: [],
        startedAt: '2025-06-14T13:00:00.000Z',
        updatedAt: '2025-06-14T13:00:00.000Z'
      }

      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(existingSession))

      const updateData = { currentStep: 2 }
      saveV2Session(updateData)

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'v2_diagnosis_session',
        JSON.stringify({
          ...existingSession,
          currentStep: 2,
          updatedAt: '2025-06-14T14:00:00.000Z'
        })
      )
    })
  })

  describe('addV2ClickedService', () => {
    it('should add new service to clicked services', () => {
      const existingSession = {
        sessionId: 'test-session',
        userId: 'test-user',
        currentStep: 1,
        answers: {},
        freeText: '',
        clickedServices: [],
        startedAt: '2025-06-14T13:00:00.000Z',
        updatedAt: '2025-06-14T13:00:00.000Z'
      }

      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(existingSession))

      const service = {
        id: 'service-1',
        name: 'Test Service',
        url: 'https://example.com'
      }

      addV2ClickedService(service)

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'v2_diagnosis_session',
        JSON.stringify({
          ...existingSession,
          clickedServices: [{
            ...service,
            clickedAt: '2025-06-14T14:00:00.000Z'
          }],
          updatedAt: '2025-06-14T14:00:00.000Z'
        })
      )
    })

    it('should not add duplicate services', () => {
      const existingService = {
        id: 'service-1',
        name: 'Test Service',
        url: 'https://example.com',
        clickedAt: '2025-06-14T13:00:00.000Z'
      }

      const existingSession = {
        sessionId: 'test-session',
        userId: 'test-user',
        currentStep: 1,
        answers: {},
        freeText: '',
        clickedServices: [existingService],
        startedAt: '2025-06-14T13:00:00.000Z',
        updatedAt: '2025-06-14T13:00:00.000Z'
      }

      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(existingSession))

      addV2ClickedService({
        id: 'service-1',
        name: 'Test Service',
        url: 'https://example.com'
      })

      // 重複チェックで早期リターンするため、setItemは呼ばれない
      expect(mockSessionStorage.setItem).not.toHaveBeenCalled()
    })
  })
})