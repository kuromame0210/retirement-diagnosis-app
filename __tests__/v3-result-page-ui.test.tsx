/**
 * V3結果ページUI表示テスト
 * ServiceCardコンポーネントとローディング画面の表示確認
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter, useSearchParams } from 'next/navigation'
import V3ResultPage from '@/app/v3/result/page'

// Next.js router のモック
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))

// V3セッション管理のモック
jest.mock('@/lib/v3/session', () => ({
  getV3Session: jest.fn(),
  setV3FinalResult: jest.fn(),
  addV3ClickedService: jest.fn(),
  syncV3SessionToServer: jest.fn(),
}))

// 分析関数のモック
jest.mock('@/lib/analytics', () => ({
  trackEvent: jest.fn(),
}))

// サービス推薦エンジンのモック
jest.mock('@/lib/v3/serviceRecommendation', () => ({
  v3ServiceEngine: jest.fn(),
  v3ServiceTracker: jest.fn(),
}))

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
}

const mockSearchParams = {
  get: jest.fn(),
}

// テストデータ
const mockSession = {
  sessionId: 'test-session-123',
  userId: 'test-user-123',
  version: 'v3',
  currentStep: 5,
  totalQuestions: 10,
  completedQuestions: 5,
  isCompleted: false,
  textAnswers: {
    q1: {
      questionId: 'q1',
      question: 'テスト質問1',
      answer: 'テスト回答1',
      answeredAt: '2023-01-01T09:00:00+09:00',
      characterCount: 10
    }
  },
  partialDiagnosisHistory: [{
    diagnosedAt: '2023-01-01T09:00:00+09:00',
    answeredQuestions: 5,
    confidenceLevel: 'medium' as const,
    resultType: '要注意型',
    summary: 'テスト診断結果のサマリーです。',
    recommendations: ['おすすめ1', 'おすすめ2']
  }],
  clickedServices: [],
  startedAt: '2023-01-01T09:00:00+09:00',
  updatedAt: '2023-01-01T09:00:00+09:00'
}

const mockServiceRecommendations = [
  {
    service: {
      id: 'service-1',
      name: 'テスト転職サービス',
      description: 'テスト用の転職支援サービスです',
      url: 'https://example.com/service1',
      image: '/test-image1.jpg',
      tags: ['転職', 'IT', '正社員']
    },
    rank: 1,
    score: 0.95,
    priority: 'urgent' as const,
    timing: 'immediate' as const,
    aiReason: 'Claude AIがあなたの状況を分析した結果、このサービスが最適です',
    expectedOutcome: '3ヶ月以内に転職成功の可能性が高いです',
    matchFactors: ['高いスキルマッチ', '緊急度対応']
  },
  {
    service: {
      id: 'service-2',
      name: 'テストスキルアップサービス',
      description: 'テスト用のスキルアップサービスです',
      url: 'https://example.com/service2',
      image: '/test-image2.jpg',
      tags: ['スキルアップ', 'オンライン', 'プログラミング']
    },
    rank: 2,
    score: 0.85,
    priority: 'recommended' as const,
    timing: 'soon' as const,
    aiReason: 'スキル向上によってキャリアの選択肢が広がります',
    expectedOutcome: '半年でスキルレベルが大幅に向上します',
    matchFactors: ['スキル向上意欲', '学習時間確保']
  }
]

describe('V3結果ページUI表示テスト', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    
    // デフォルトでpartial診断タイプを設定
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === 'type') return 'partial'
      return null
    })

    // セッション管理のモック設定
    const { getV3Session } = require('@/lib/v3/session')
    getV3Session.mockReturnValue(mockSession)

    // global fetch のモック設定
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('ローディング画面の表示', () => {
    test('初期ローディング時にV3専用のローディングUIが表示される', async () => {
      render(<V3ResultPage />)
      
      // ローディングスピナーの確認
      expect(screen.getByText('Claude AIが分析中...')).toBeInTheDocument()
      expect(screen.getByText('V3 Advanced Analysis')).toBeInTheDocument()
      
      // プロセス表示の確認
      expect(screen.getByText('質問分析')).toBeInTheDocument()
      expect(screen.getByText('テキスト感情分析')).toBeInTheDocument()
      expect(screen.getByText('キャリア意図解析')).toBeInTheDocument()
      expect(screen.getByText('最適サービス選定')).toBeInTheDocument()
      
      // V3特徴説明の確認
      expect(screen.getByText('✨ V3システムの特徴')).toBeInTheDocument()
      expect(screen.getByText('テキスト深層解析')).toBeInTheDocument()
      expect(screen.getByText('AI個別推薦')).toBeInTheDocument()
    })

    test('最終診断実行中に専用のローディングメッセージが表示される', async () => {
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'type') return 'final'
        return null
      })

      // 最終診断APIのモック
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            resultType: '要注意型',
            summary: '最終診断結果',
            serviceRecommendations: mockServiceRecommendations
          }
        })
      })

      render(<V3ResultPage />)
      
      // 最終診断特有のメッセージ
      expect(screen.getByText('Claude AIが分析中...')).toBeInTheDocument()
    })
  })

  describe('サービスカードの表示（V2スタイル）', () => {
    beforeEach(async () => {
      // サービス推薦エンジンのモック
      const { v3ServiceEngine } = require('@/lib/v3/serviceRecommendation')
      v3ServiceEngine.mockResolvedValue(mockServiceRecommendations)
    })

    test('1位サービスにゴールドメダル装飾が表示される', async () => {
      render(<V3ResultPage />)
      
      await waitFor(() => {
        expect(screen.getByText('テスト転職サービス')).toBeInTheDocument()
      })

      // ランキングバッジの確認
      expect(screen.getByText('🏆')).toBeInTheDocument()
      expect(screen.getByText('1位')).toBeInTheDocument()
      
      // 1位専用のボタンテキスト
      expect(screen.getByText('🚀 今すぐ詳細をチェック！')).toBeInTheDocument()
    })

    test('2位サービスにシルバーメダル装飾が表示される', async () => {
      render(<V3ResultPage />)
      
      await waitFor(() => {
        expect(screen.getByText('テストスキルアップサービス')).toBeInTheDocument()
      })

      // ランキングバッジの確認
      expect(screen.getByText('🥈')).toBeInTheDocument()
      expect(screen.getByText('2位')).toBeInTheDocument()
      
      // 2位以下のボタンテキスト
      expect(screen.getByText('✨ 詳細を確認する')).toBeInTheDocument()
    })

    test('サービスカード内の情報が正しく表示される', async () => {
      render(<V3ResultPage />)
      
      await waitFor(() => {
        expect(screen.getByText('テスト転職サービス')).toBeInTheDocument()
      })

      // サービス詳細情報
      expect(screen.getByText('テスト用の転職支援サービスです')).toBeInTheDocument()
      expect(screen.getByText('Claude AIがあなたの状況を分析した結果、このサービスが最適です')).toBeInTheDocument()
      expect(screen.getByText('3ヶ月以内に転職成功の可能性が高いです')).toBeInTheDocument()
      
      // マッチ度表示
      expect(screen.getByText('マッチ度 95%')).toBeInTheDocument()
      
      // タグ表示
      expect(screen.getByText('転職')).toBeInTheDocument()
      expect(screen.getByText('IT')).toBeInTheDocument()
      expect(screen.getByText('正社員')).toBeInTheDocument()
    })

    test('緊急度の高いサービスに特別な表示がされる', async () => {
      render(<V3ResultPage />)
      
      await waitFor(() => {
        expect(screen.getByText('緊急度: 高（今すぐ行動推奨）')).toBeInTheDocument()
      })

      // 緊急度アイコンの確認
      expect(screen.getByText('今すぐ')).toBeInTheDocument()
    })
  })

  describe('サービスクリック動作', () => {
    test('サービスカードクリックで適切なイベントが発火される', async () => {
      const { addV3ClickedService } = require('@/lib/v3/session')
      const { trackEvent } = require('@/lib/analytics')
      
      // window.open のモック
      const mockWindowOpen = jest.fn()
      global.window.open = mockWindowOpen

      render(<V3ResultPage />)
      
      await waitFor(() => {
        expect(screen.getByText('🚀 今すぐ詳細をチェック！')).toBeInTheDocument()
      })

      // サービスカードをクリック
      fireEvent.click(screen.getByText('🚀 今すぐ詳細をチェック！'))

      // クリック記録の確認
      expect(addV3ClickedService).toHaveBeenCalledWith(
        'service-1',
        'テスト転職サービス',
        'https://example.com/service1',
        expect.any(String),
        expect.any(String)
      )

      // 分析イベントの確認
      expect(trackEvent).toHaveBeenCalled()

      // 外部リンクオープンの確認
      expect(mockWindowOpen).toHaveBeenCalledWith('https://example.com/service1', '_blank')
    })
  })

  describe('画像読み込み状態', () => {
    test('画像読み込み中にローディングスピナーが表示される', async () => {
      render(<V3ResultPage />)
      
      await waitFor(() => {
        expect(screen.getByText('テスト転職サービス')).toBeInTheDocument()
      })

      // 画像読み込み前はスピナーが表示される
      const loadingSpinners = document.querySelectorAll('.animate-spin')
      expect(loadingSpinners.length).toBeGreaterThan(0)
    })
  })

  describe('ヒント表示（V2スタイル）', () => {
    test('サービス選択のヒントセクションが表示される', async () => {
      render(<V3ResultPage />)
      
      await waitFor(() => {
        expect(screen.getByText('💡 迷ったときは...')).toBeInTheDocument()
      })

      expect(screen.getByText('まずは1位のサービスから詳細をチェックしてみるのがおすすめです！')).toBeInTheDocument()
      expect(screen.getByText('✨ Claude AIがあなたの回答を深く分析して選んだ最適解です')).toBeInTheDocument()
    })
  })

  describe('エラーハンドリング', () => {
    test('サービス推薦取得失敗時にエラーメッセージが表示される', async () => {
      const { v3ServiceEngine } = require('@/lib/v3/serviceRecommendation')
      v3ServiceEngine.mockRejectedValue(new Error('推薦生成エラー'))

      render(<V3ResultPage />)
      
      await waitFor(() => {
        expect(screen.getByText('サービス推薦システムを調整中')).toBeInTheDocument()
      })

      expect(screen.getByText('申し訳ございません。現在サービス推薦を生成できませんでした。')).toBeInTheDocument()
      expect(screen.getByText('再試行')).toBeInTheDocument()
    })

    test('診断結果がない場合のエラー表示', async () => {
      const { getV3Session } = require('@/lib/v3/session')
      getV3Session.mockReturnValue({
        ...mockSession,
        partialDiagnosisHistory: []
      })

      render(<V3ResultPage />)
      
      await waitFor(() => {
        expect(screen.getByText('診断結果が見つかりません')).toBeInTheDocument()
      })

      expect(screen.getByText('診断を実行してから結果をご確認ください')).toBeInTheDocument()
      expect(screen.getByText('診断を開始する')).toBeInTheDocument()
    })
  })

  describe('レスポンシブ対応', () => {
    test('スマートフォン表示でのランキングバッジサイズ調整', async () => {
      // viewport サイズを小さく設定
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      render(<V3ResultPage />)
      
      await waitFor(() => {
        expect(screen.getByText('テスト転職サービス')).toBeInTheDocument()
      })

      // レスポンシブクラスが適用されているかの確認
      const rankBadges = document.querySelectorAll('[class*="sm:w-"]')
      expect(rankBadges.length).toBeGreaterThan(0)
    })
  })
})