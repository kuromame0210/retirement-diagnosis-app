/**
 * 実際のClaude APIを使った診断テスト
 * 本物のAPIレスポンスでJSON解析が正常に動作するかテスト
 */

// モック設定（実際のAPIを使うためモックを無効化）
jest.mock('@/lib/v3/session', () => ({
  getV3Session: jest.fn(() => ({
    sessionId: 'real-api-test',
    userId: 'real-user',
    version: 'v3'
  }))
}))

jest.mock('@/lib/v3/database', () => ({
  saveV3DiagnosisData: jest.fn(() => Promise.resolve({ success: true }))
}))

jest.mock('@/lib/utils/timestamp', () => ({
  getJSTTimestamp: jest.fn(() => new Date().toISOString())
}))

describe('実際のClaude API診断テスト', () => {
  // 実際のAPIキーが設定されている場合のみテスト実行
  const hasApiKey = process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.length > 0
  
  if (!hasApiKey) {
    console.log('⚠️ ANTHROPIC_API_KEY not found - skipping real API tests')
  }

  const testRequest = {
    sessionId: 'real-api-test-session',
    diagnosisType: 'final' as const,
    answeredQuestions: 3,
    q1_text: '毎日仕事に行くのが憂鬱で、上司からのプレッシャーがきつく、長時間労働で疲れ果てています。このまま続けていても将来が見えません。',
    q2_text: '職場の人間関係が最悪で、パワハラもあります。ストレスで眠れない日が続いており、体調も悪化しています。',
    q3_text: 'やる気が全くなく、モチベーションを保つのが困難です。転職を考えていますが、不安もあります。'
  }

  it('should successfully call Claude API and get valid diagnosis', async () => {
    if (!hasApiKey) {
      console.log('Skipping: No API key')
      return
    }

    console.log('🚀 Starting real Claude API test...')
    const startTime = Date.now()

    try {
      // 実際のAPIを呼び出すため、executeDetailedPersonalDiagnosisを直接import
      const { executeDetailedPersonalDiagnosis } = await import('@/lib/v3/staged-diagnosis')
      const result = await executeDetailedPersonalDiagnosis(testRequest)
      const endTime = Date.now()
      
      console.log(`⏱️ API call completed in ${endTime - startTime}ms`)
      console.log('📊 Result type:', result.result_type)
      console.log('🎯 Confidence:', result.confidence_level)
      console.log('📝 Summary preview:', result.personal_summary.substring(0, 100) + '...')

      // 基本構造の確認
      expect(result.result_type).toBeDefined()
      expect(['転職推奨型', '転職検討型', '現職改善型', '様子見型', '要注意型']).toContain(result.result_type)
      expect(result.confidence_level).toBeDefined()
      expect(['low', 'medium', 'high']).toContain(result.confidence_level)
      
      // 詳細内容の確認
      expect(result.personal_summary).toBeDefined()
      expect(result.personal_summary.length).toBeGreaterThan(50)
      expect(result.emotional_connection.recognition).toBeDefined()
      expect(result.emotional_connection.validation).toBeDefined()
      expect(result.emotional_connection.hope_message).toBeDefined()
      
      // アクションプランの確認
      expect(result.personalized_action_plan.this_week).toBeInstanceOf(Array)
      expect(result.personalized_action_plan.this_week.length).toBeGreaterThan(0)
      expect(result.personalized_action_plan.this_week[0].action).toBeDefined()
      expect(result.personalized_action_plan.this_week[0].why_for_you).toBeDefined()
      expect(result.personalized_action_plan.this_week[0].how_to_start).toBeDefined()
      
      // フォールバックでないことを確認
      expect(result.personal_summary).not.toContain('システムエラー')
      expect(result.personal_summary).not.toContain('システムの制約')
      expect(result.personal_insights.your_situation_analysis).not.toContain('専門家との個別相談が効果的です')
      expect(result.personalized_action_plan.this_week[0].action).not.toContain('専門家への相談を検討する')
      
      console.log('✅ Real Claude API test passed!')
      console.log('🔍 Personal insights:')
      console.log('  - Situation:', result.personal_insights.your_situation_analysis.substring(0, 80) + '...')
      console.log('  - Emotional pattern:', result.personal_insights.emotional_pattern.substring(0, 80) + '...')
      console.log('  - Strengths:', result.personal_insights.career_strengths.slice(0, 2))
      
    } catch (error) {
      console.error('❌ Real Claude API test failed:', error.message)
      
      if (error.message.includes('API key')) {
        console.log('💡 Check ANTHROPIC_API_KEY environment variable')
      } else if (error.message.includes('rate limit')) {
        console.log('💡 API rate limit reached - try again later')
      } else if (error.message.includes('timeout')) {
        console.log('💡 API call timed out - network may be slow')
      }
      
      throw error
    }
  }, 30000) // 30秒タイムアウト

  it('should handle multiple consecutive API calls', async () => {
    if (!hasApiKey) {
      console.log('Skipping: No API key')
      return
    }

    console.log('🔄 Testing consecutive API calls...')
    const requests = [
      {
        ...testRequest,
        sessionId: 'consecutive-test-1',
        q1_text: '仕事にやりがいを感じられず、毎日が単調で退屈です。'
      },
      {
        ...testRequest,
        sessionId: 'consecutive-test-2', 
        q1_text: '残業が多すぎて家族との時間が取れません。ワークライフバランスが最悪です。'
      }
    ]

    for (let i = 0; i < requests.length; i++) {
      console.log(`📞 API call ${i + 1}/${requests.length}`)
      const { executeDetailedPersonalDiagnosis } = await import('@/lib/v3/staged-diagnosis')
      const result = await executeDetailedPersonalDiagnosis(requests[i])
      
      expect(result.result_type).toBeDefined()
      expect(result.personal_summary).toBeDefined()
      expect(result.personal_summary).not.toContain('システムエラー')
      
      console.log(`✅ Call ${i + 1} completed: ${result.result_type}`)
      
      // API rate limit対策で少し待機
      if (i < requests.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    
    console.log('✅ Consecutive API calls test passed!')
  }, 60000) // 60秒タイムアウト

  it('should handle different emotional intensity levels', async () => {
    if (!hasApiKey) {
      console.log('Skipping: No API key')
      return
    }

    const emotionalTestCases = [
      {
        name: '軽度ストレス',
        request: {
          ...testRequest,
          sessionId: 'emotional-test-mild',
          q1_text: '最近少し仕事にマンネリを感じています。新しいチャレンジがしたいです。',
          q2_text: '人間関係は良好ですが、もう少しスキルアップしたいと思っています。',
          q3_text: 'キャリアの方向性について考えています。'
        }
      },
      {
        name: '重度ストレス',
        request: {
          ...testRequest,
          sessionId: 'emotional-test-severe',
          q1_text: '毎日が地獄のようで、うつ状態が続いています。会社に行くのが苦痛でたまりません。',
          q2_text: '上司からのパワハラがひどく、心身ともに限界です。医師からも休職を勧められています。',
          q3_text: 'もう何もやる気が起きません。全てを投げ出したい気持ちです。'
        }
      }
    ]

    for (const testCase of emotionalTestCases) {
      console.log(`🧠 Testing ${testCase.name}...`)
      
      const { executeDetailedPersonalDiagnosis } = await import('@/lib/v3/staged-diagnosis')
      const result = await executeDetailedPersonalDiagnosis(testCase.request)
      
      expect(result.result_type).toBeDefined()
      expect(result.urgency_level).toBeDefined()
      expect(result.emotional_connection.recognition).toBeDefined()
      expect(result.personalized_action_plan.this_week[0].action).toBeDefined()
      
      console.log(`  - Type: ${result.result_type}`)
      console.log(`  - Urgency: ${result.urgency_level}`)
      console.log(`  - First action: ${result.personalized_action_plan.this_week[0].action.substring(0, 50)}...`)
      
      // 重度ストレスの場合はより緊急度が高いはず
      if (testCase.name === '重度ストレス') {
        expect(['転職推奨型', '要注意型']).toContain(result.result_type)
        expect(['medium', 'high']).toContain(result.urgency_level)
      }
      
      // API rate limit対策
      await new Promise(resolve => setTimeout(resolve, 3000))
    }
    
    console.log('✅ Emotional intensity test passed!')
  }, 90000) // 90秒タイムアウト
})