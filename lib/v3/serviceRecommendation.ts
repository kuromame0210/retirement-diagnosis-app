/**
 * V3診断システム - サービス推薦エンジン
 * V2ロジック + Claude AI分析の統合
 */

import { services, ServiceInfo } from '@/lib/services'
import { V3Session, V3Answer, V3PartialResult, V3FinalResult } from './session'
import { getJSTTimestamp } from '@/lib/utils/timestamp'
import { trackEvent } from '@/lib/analytics'

// ============================================
// 型定義
// ============================================

export interface V3ServiceRecommendation {
  service: ServiceInfo
  rank: number
  score: number
  aiReason: string
  priority: 'urgent' | 'recommended' | 'consider'
  timing: 'immediate' | '1-3months' | '3-6months'
  expectedOutcome: string
  alternatives?: string[]
  matchFactors: string[]
}

export interface ServiceClickEvent {
  serviceId: string
  serviceName: string
  serviceUrl: string
  rank: number
  priority: 'urgent' | 'recommended' | 'consider'
  clickType: 'card_click' | 'button_click' | 'title_click'
  timestamp: string
  sessionId: string
  diagnosisType: string
}

// ============================================
// V3サービス推薦エンジン
// ============================================

export class V3ServiceRecommendationEngine {
  /**
   * メイン推薦生成
   */
  async generateRecommendations(sessionData: V3Session): Promise<V3ServiceRecommendation[]> {
    try {
      // 1. セッションデータから分析結果を取得
      const analysis = this.getLatestAnalysis(sessionData)
      const answers = Object.values(sessionData.textAnswers || {})
      
      console.log('🔍 [Service Recommendation] セッションデータ:', {
        answersCount: answers.length,
        hasAnalysis: !!analysis,
        sessionId: sessionData.sessionId
      })
      
      // 2. 各サービスをスコアリング
      const scoredServices = await Promise.all(
        services.map(service => this.scoreService(service, answers, analysis))
      )
      
      console.log('🔍 [Service Recommendation] スコアリング結果:', {
        totalServices: services.length,
        scoredServices: scoredServices.length,
        scores: scoredServices.map(s => ({ name: s.service.name, score: s.score }))
      })
      
      // 3. スコア順でソート & フィルタリング（最低スコアを0.5に下げる）
      let recommendations = scoredServices
        .filter(rec => rec.score >= 0.5) // 最低スコアを下げる
        .sort((a, b) => b.score - a.score)
        .slice(0, 8) // 上位8件
        .map((rec, index) => ({
          ...rec,
          rank: index + 1
        }))
      
      console.log('🔍 [Service Recommendation] フィルタリング後:', {
        recommendationsCount: recommendations.length,
        filteredOut: scoredServices.length - recommendations.length
      })
      
      // 4. 最低3つのサービス提案を保証（より確実な方法）
      if (recommendations.length < 3) {
        console.log('⚠️ 推薦サービスが3つ未満のため、フォールバック推薦を生成します')
        
        // 既に推薦されているサービスのIDを取得
        const recommendedServiceIds = new Set(recommendations.map(rec => rec.service.id))
        
        // 未推薦のサービスから上位を選択（スコア関係なく）
        const additionalServices = services
          .filter(service => !recommendedServiceIds.has(service.id))
          .slice(0, Math.max(3 - recommendations.length, 3)) // 最低3つは確保
          .map((service, index) => ({
            service,
            rank: recommendations.length + index + 1,
            score: 1.5, // 最低限のスコアを設定
            aiReason: `${service.description} あなたの状況に応じて検討してみてください。`,
            priority: 'consider' as const,
            timing: '3-6months' as const,
            expectedOutcome: '現状の改善と新しい選択肢の提供',
            matchFactors: ['一般推奨']
          }))
        
        recommendations = [...recommendations, ...additionalServices]
        console.log('✅ フォールバック推薦を追加:', additionalServices.length)
      }
      
      // 5. 最終的に推薦が0の場合の緊急フォールバック
      if (recommendations.length === 0) {
        console.log('🚨 緊急フォールバック: 強制的に3つのサービスを推薦')
        recommendations = this.getFallbackRecommendations()
      }
      
      console.log('✅ V3サービス推薦生成完了:', {
        totalServices: services.length,
        scoredServices: scoredServices.length,
        finalRecommendations: recommendations.length,
        minimumGuaranteed: recommendations.length >= 3,
        topRecommendations: recommendations.slice(0, 3).map(r => ({ name: r.service.name, score: r.score }))
      })
      
      return recommendations
      
    } catch (error) {
      console.error('❌ サービス推薦生成エラー:', error)
      console.error('エラー詳細:', error.stack)
      return this.getFallbackRecommendations()
    }
  }
  
  /**
   * 個別サービスのスコアリング
   */
  private async scoreService(
    service: ServiceInfo, 
    answers: V3Answer[], 
    analysis?: any
  ): Promise<V3ServiceRecommendation> {
    let score = 0
    const matchFactors: string[] = []
    
    console.log(`🔍 [Scoring] ${service.name}: 回答数=${answers.length}`)
    
    // 回答がない場合のフォールバック（最低スコアを保証）
    if (answers.length === 0) {
      console.log(`⚠️ [Scoring] ${service.name}: 回答なし、デフォルト推薦を作成`)
      const defaultRec = this.createDefaultRecommendation(service)
      defaultRec.score = 1.0 // 最低スコアを保証
      return defaultRec
    }
    
    // Q1: 現在の仕事への感情分析
    const q1Answer = answers.find(a => a.questionId === 'q1_text')?.answer || ''
    score += this.analyzeQ1Sentiment(q1Answer, service, matchFactors)
    
    // Q2: ストレス要因分析
    const q2Answer = answers.find(a => a.questionId === 'q2_text')?.answer || ''
    score += this.analyzeStressFactors(q2Answer, service, matchFactors)
    
    // Q3: モチベーション分析
    const q3Answer = answers.find(a => a.questionId === 'q3_text')?.answer || ''
    score += this.analyzeMotivation(q3Answer, service, matchFactors)
    
    // Q4: 理想の働き方
    const q4Answer = answers.find(a => a.questionId === 'q4_text')?.answer || ''
    score += this.analyzeWorkStyle(q4Answer, service, matchFactors)
    
    // Q5: キャリア不安
    const q5Answer = answers.find(a => a.questionId === 'q5_text')?.answer || ''
    score += this.analyzeCareerAnxiety(q5Answer, service, matchFactors)
    
    // 回答数による補正
    const answerCount = answers.length
    const completionBonus = answerCount >= 5 ? 0.5 : answerCount * 0.1
    score += completionBonus
    
    // 最低スコアを保証（全サービスが表示されないのを防ぐ）
    if (score < 0.5) {
      score = 0.5 + (Math.random() * 0.5) // 0.5-1.0の範囲でランダムスコア
      matchFactors.push('基本推奨')
    }
    
    // 優先度とタイミングを決定
    const { priority, timing } = this.determinePriorityAndTiming(score, matchFactors)
    
    const result = {
      service,
      rank: 0, // 後で設定
      score: Math.round(score * 10) / 10,
      aiReason: this.generateRecommendationReason(service, matchFactors, q1Answer),
      priority,
      timing,
      expectedOutcome: this.generateExpectedOutcome(service, matchFactors),
      matchFactors
    }
    
    console.log(`✅ [Scoring] ${service.name}: スコア=${result.score}, マッチ要因=${matchFactors.length}`)
    
    return result
  }
  
  /**
   * Q1: 仕事への感情分析
   */
  private analyzeQ1Sentiment(answer: string, service: ServiceInfo, matchFactors: string[]): number {
    let score = 0
    const lowerAnswer = answer.toLowerCase()
    
    // ネガティブ感情
    if (lowerAnswer.includes('ストレス') || lowerAnswer.includes('疲れ') || lowerAnswer.includes('辛い')) {
      if (service.category.includes('退職代行')) {
        score += 3
        matchFactors.push('高ストレス状態')
      }
      if (service.category.includes('転職支援')) {
        score += 2
        matchFactors.push('転職検討段階')
      }
    }
    
    // 成長志向
    if (lowerAnswer.includes('成長') || lowerAnswer.includes('スキル') || lowerAnswer.includes('学び')) {
      if (service.category.includes('スキルアップ')) {
        score += 2.5
        matchFactors.push('成長意欲')
      }
      if (service.targetType.includes('成長志向型')) {
        score += 2
        matchFactors.push('成長志向')
      }
    }
    
    // やりがい不足
    if (lowerAnswer.includes('やりがい') && lowerAnswer.includes('ない')) {
      if (service.category.includes('転職支援') || service.category.includes('フリーランス')) {
        score += 2
        matchFactors.push('やりがい不足')
      }
    }
    
    return score
  }
  
  /**
   * Q2: ストレス要因分析
   */
  private analyzeStressFactors(answer: string, service: ServiceInfo, matchFactors: string[]): number {
    let score = 0
    const lowerAnswer = answer.toLowerCase()
    
    // 人間関係の問題
    if (lowerAnswer.includes('上司') || lowerAnswer.includes('人間関係') || lowerAnswer.includes('パワハラ')) {
      if (service.category.includes('退職代行')) {
        score += 3
        matchFactors.push('人間関係の悩み')
      }
      if (service.id === 'resort-baito' || service.category.includes('地方転職')) {
        score += 1.5
        matchFactors.push('環境変化の必要性')
      }
    }
    
    // 労働環境
    if (lowerAnswer.includes('残業') || lowerAnswer.includes('働きすぎ') || lowerAnswer.includes('ブラック')) {
      if (service.id === 'se-navi') {
        score += 2.5
        matchFactors.push('ワークライフバランス重視')
      }
      if (service.category.includes('転職支援')) {
        score += 2
        matchFactors.push('労働環境改善')
      }
    }
    
    // スキル・能力の問題
    if (lowerAnswer.includes('スキル') || lowerAnswer.includes('能力') || lowerAnswer.includes('技術')) {
      if (service.category.includes('スキルアップ')) {
        score += 2.5
        matchFactors.push('スキル向上必要')
      }
    }
    
    return score
  }
  
  /**
   * Q3: モチベーション分析
   */
  private analyzeMotivation(answer: string, service: ServiceInfo, matchFactors: string[]): number {
    let score = 0
    const lowerAnswer = answer.toLowerCase()
    
    // 低モチベーション
    if (lowerAnswer.includes('やる気') && lowerAnswer.includes('ない') || 
        lowerAnswer.includes('モチベーション') && lowerAnswer.includes('低')) {
      if (service.category.includes('リゾートバイト') || service.category.includes('留学')) {
        score += 2
        matchFactors.push('リフレッシュが必要')
      }
    }
    
    // 高い意欲
    if (lowerAnswer.includes('頑張') || lowerAnswer.includes('チャレンジ') || lowerAnswer.includes('挑戦')) {
      if (service.targetType.includes('成長志向型')) {
        score += 2
        matchFactors.push('チャレンジ精神')
      }
    }
    
    return score
  }
  
  /**
   * Q4: 理想の働き方分析
   */
  private analyzeWorkStyle(answer: string, service: ServiceInfo, matchFactors: string[]): number {
    let score = 0
    const lowerAnswer = answer.toLowerCase()
    
    // リモートワーク志向
    if (lowerAnswer.includes('リモート') || lowerAnswer.includes('在宅')) {
      if (service.category.includes('フリーランス') || service.category.includes('IT')) {
        score += 2
        matchFactors.push('リモートワーク志向')
      }
    }
    
    // ワークライフバランス
    if (lowerAnswer.includes('ワークライフバランス') || lowerAnswer.includes('プライベート')) {
      if (service.id === 'se-navi' || service.category.includes('地方転職')) {
        score += 2
        matchFactors.push('ワークライフバランス重視')
      }
    }
    
    // 独立志向
    if (lowerAnswer.includes('独立') || lowerAnswer.includes('フリーランス')) {
      if (service.category.includes('フリーランス')) {
        score += 3
        matchFactors.push('独立志向')
      }
      if (service.category.includes('副業')) {
        score += 2
        matchFactors.push('副業から独立準備')
      }
    }
    
    return score
  }
  
  /**
   * Q5: キャリア不安分析
   */
  private analyzeCareerAnxiety(answer: string, service: ServiceInfo, matchFactors: string[]): number {
    let score = 0
    const lowerAnswer = answer.toLowerCase()
    
    // スキル不安
    if (lowerAnswer.includes('スキル') && lowerAnswer.includes('不安')) {
      if (service.category.includes('スキルアップ')) {
        score += 2.5
        matchFactors.push('スキル不安の解消')
      }
    }
    
    // 年収不安
    if (lowerAnswer.includes('年収') || lowerAnswer.includes('給料') || lowerAnswer.includes('収入')) {
      if (service.category.includes('転職支援') || service.category.includes('副業')) {
        score += 2
        matchFactors.push('収入向上への期待')
      }
    }
    
    // 将来性不安
    if (lowerAnswer.includes('将来') && lowerAnswer.includes('不安')) {
      if (service.targetType.includes('成長志向型')) {
        score += 2
        matchFactors.push('将来への投資')
      }
    }
    
    return score
  }
  
  /**
   * 優先度とタイミングの決定
   */
  private determinePriorityAndTiming(score: number, matchFactors: string[]): {
    priority: 'urgent' | 'recommended' | 'consider'
    timing: 'immediate' | '1-3months' | '3-6months'
  } {
    // 緊急性の高いキーワード
    const urgentFactors = ['高ストレス状態', '人間関係の悩み', 'リフレッシュが必要']
    const hasUrgentFactor = matchFactors.some(factor => urgentFactors.includes(factor))
    
    if (score >= 4 || hasUrgentFactor) {
      return { priority: 'urgent', timing: 'immediate' }
    } else if (score >= 2.5) {
      return { priority: 'recommended', timing: '1-3months' }
    } else {
      return { priority: 'consider', timing: '3-6months' }
    }
  }
  
  /**
   * 推薦理由の生成
   */
  private generateRecommendationReason(service: ServiceInfo, matchFactors: string[], q1Answer: string): string {
    if (matchFactors.length === 0) {
      return `${service.description}`
    }
    
    const mainFactor = matchFactors[0]
    const reasonMap: Record<string, string> = {
      '高ストレス状態': `現在の職場でのストレスが高い状況から、${service.name}が適切な解決策を提供できます。`,
      '成長意欲': `あなたの成長への意欲を活かして、${service.name}でさらなるスキルアップが期待できます。`,
      'ワークライフバランス重視': `理想とするワークライフバランスを実現するために、${service.name}が最適です。`,
      '独立志向': `将来の独立に向けて、${service.name}が必要なスキルと経験を提供します。`,
      'リフレッシュが必要': `現在の状況をリセットするために、${service.name}で新しい環境を体験することをお勧めします。`
    }
    
    return reasonMap[mainFactor] || service.description
  }
  
  /**
   * 期待される効果の生成
   */
  private generateExpectedOutcome(service: ServiceInfo, matchFactors: string[]): string {
    const outcomeMap: Record<string, string> = {
      '高ストレス状態': 'ストレス軽減と心身の健康回復',
      '成長意欲': '新しいスキル習得とキャリアアップ',
      'ワークライフバランス重視': 'プライベート時間の確保と生活の質向上',
      '独立志向': '独立準備と収入源の多様化',
      'リフレッシュが必要': '気分転換と新しい視点の獲得'
    }
    
    if (matchFactors.length > 0) {
      return outcomeMap[matchFactors[0]] || '現状の改善と目標達成'
    }
    
    return '現状の改善と目標達成'
  }
  
  /**
   * 最新の分析結果取得
   */
  private getLatestAnalysis(sessionData: V3Session): any {
    if (sessionData.finalResult) {
      return sessionData.finalResult
    }
    
    if (sessionData.partialDiagnosisHistory && sessionData.partialDiagnosisHistory.length > 0) {
      return sessionData.partialDiagnosisHistory[sessionData.partialDiagnosisHistory.length - 1]
    }
    
    return null
  }
  
  /**
   * フォールバック推薦（最低3つを保証）
   */
  private getFallbackRecommendations(): V3ServiceRecommendation[] {
    const fallbackCount = Math.max(3, Math.min(5, services.length))
    return services.slice(0, fallbackCount).map((service, index) => ({
      service,
      rank: index + 1,
      score: 2.0,
      aiReason: `${service.description} エラーが発生しましたが、このサービスが一般的におすすめです。`,
      priority: 'consider' as const,
      timing: '1-3months' as const,
      expectedOutcome: '現状の改善と目標達成',
      matchFactors: ['基本推奨']
    }))
  }
  
  /**
   * デフォルト推薦の作成
   */
  private createDefaultRecommendation(service: ServiceInfo): V3ServiceRecommendation {
    return {
      service,
      rank: 0,
      score: 1.0,
      aiReason: `${service.description} まずは情報収集から始めてみることをおすすめします。`,
      priority: 'consider',
      timing: '3-6months',
      expectedOutcome: '現状の改善と新しい可能性の発見',
      matchFactors: ['基本推奨']
    }
  }
}

// ============================================
// サービスクリック追跡
// ============================================

export class V3ServiceTracker {
  /**
   * サービスクリック追跡
   */
  async trackServiceClick(
    recommendation: V3ServiceRecommendation,
    clickType: 'card_click' | 'button_click' | 'title_click'
  ): Promise<void> {
    try {
      const { getV3Session, addV3ClickedService } = await import('./session')
      const sessionData = getV3Session()
      
      const clickEvent: ServiceClickEvent = {
        serviceId: recommendation.service.id,
        serviceName: recommendation.service.name,
        serviceUrl: recommendation.service.url,
        rank: recommendation.rank,
        priority: recommendation.priority,
        clickType,
        timestamp: getJSTTimestamp(),
        sessionId: sessionData.sessionId,
        diagnosisType: sessionData.finalResult?.resultType || 'partial'
      }
      
      // セッションに記録
      addV3ClickedService({
        serviceName: recommendation.service.name,
        serviceUrl: recommendation.service.url,
        clickedAt: clickEvent.timestamp,
        diagnosisStage: clickEvent.diagnosisType,
        resultTypeWhenClicked: clickEvent.diagnosisType
      })
      
      // アナリティクス送信
      trackEvent('V3サービスクリック', {
        service_name: recommendation.service.name,
        rank: recommendation.rank,
        priority: recommendation.priority,
        click_type: clickType,
        match_factors: recommendation.matchFactors.join(',')
      })
      
      console.log('V3サービスクリック追跡完了:', clickEvent)
      
    } catch (error) {
      console.error('サービスクリック追跡エラー:', error)
    }
  }
}

// ============================================
// エクスポート
// ============================================

export const v3ServiceEngine = new V3ServiceRecommendationEngine()
export const v3ServiceTracker = new V3ServiceTracker()