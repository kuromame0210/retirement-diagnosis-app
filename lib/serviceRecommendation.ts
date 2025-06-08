// lib/serviceRecommendation.ts
import { services, ServiceInfo, RecommendedService } from './services'

interface DiagnosisResult {
  finalType: string
  urgencyLevel: string
  currentSituation: string
  // 他の診断結果フィールド...
}

// 自由記述内容の分析
function analyzeTextInput(textInput: string): { keywords: string[], sentiment: 'positive' | 'negative' | 'neutral' } {
  const text = textInput.toLowerCase()
  
  // キーワード検出
  const keywords: string[] = []
  
  // 退職関連
  if (text.includes('辞めたい') || text.includes('退職') || text.includes('やめたい')) keywords.push('退職意向')
  if (text.includes('すぐ') || text.includes('今すぐ') || text.includes('急') || text.includes('限界')) keywords.push('緊急性')
  
  // 業界・職種関連
  if (text.includes('エンジニア') || text.includes('se') || text.includes('プログラマ') || text.includes('it')) keywords.push('IT')
  if (text.includes('営業') || text.includes('セールス')) keywords.push('営業')
  if (text.includes('事務') || text.includes('バックオフィス')) keywords.push('事務')
  
  // スキル・成長関連
  if (text.includes('スキル') || text.includes('成長') || text.includes('キャリア') || text.includes('学び')) keywords.push('成長志向')
  if (text.includes('副業') || text.includes('フリーランス') || text.includes('独立')) keywords.push('独立志向')
  
  // 働き方関連
  if (text.includes('残業') || text.includes('長時間') || text.includes('激務')) keywords.push('働き方改善')
  if (text.includes('リモート') || text.includes('在宅') || text.includes('テレワーク')) keywords.push('リモートワーク')
  if (text.includes('地方') || text.includes('移住') || text.includes('田舎')) keywords.push('地方移住')
  
  // 感情分析（簡易版）
  const positiveWords = ['頑張り', '成長', '挑戦', '前向き', 'やりがい', '楽しい']
  const negativeWords = ['疲れ', 'ストレス', '辛い', '限界', '嫌', 'しんどい']
  
  const positiveCount = positiveWords.filter(word => text.includes(word)).length
  const negativeCount = negativeWords.filter(word => text.includes(word)).length
  
  let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral'
  if (positiveCount > negativeCount) sentiment = 'positive'
  else if (negativeCount > positiveCount) sentiment = 'negative'
  
  return { keywords, sentiment }
}

export function recommendServices(
  diagnosisResult: DiagnosisResult,
  userAnswers?: any,
  textInput?: string
): RecommendedService[] {
  const recommendedServices: RecommendedService[] = []

  // 自由記述の分析
  const textAnalysis = textInput ? analyzeTextInput(textInput) : { keywords: [], sentiment: 'neutral' }

  // 1. 全サービスを対象にスコアリング
  services.forEach(service => {
    let score = 0
    let reasons: string[] = []
    
    // 基本スコア（診断タイプマッチ）
    if (service.targetType.some(type => diagnosisResult.finalType.includes(type))) {
      score += 2
      reasons.push("あなたのタイプに最適")
    }
    
    // 緊急度マッチ
    if (service.urgencyLevel.includes(diagnosisResult.urgencyLevel)) {
      score += 1
      reasons.push("今の緊急度にマッチ")
    }

    // === 質問回答に基づく詳細スコアリング ===
    if (userAnswers) {
      // Q1: 仕事への気持ち
      if (userAnswers.q1 === 'quit' && service.category.includes('退職代行')) {
        // 退職代行のスコアを抑制（他の要因も考慮）
        score += (diagnosisResult.urgencyLevel === 'high' && textAnalysis.keywords.includes('緊急性')) ? 3 : 1
        reasons.push("退職意向をサポート")
      }
      
      if (userAnswers.q1 === 'continue' && (service.category.includes('スキルアップ') || service.category.includes('副業'))) {
        score += 3
        reasons.push("今の職場を活かした成長")
      }

      if (userAnswers.q1 === 'unsure' && service.category.includes('転職支援')) {
        score += 2
        reasons.push("迷いを解決する選択肢")
      }

      // Q2: 気持ちの継続期間
      if (userAnswers.q2 === 'long_ago' && service.category.includes('転職支援')) {
        score += 2
        reasons.push("長期的な悩みの解決")
      }

      // Q4: ストレス要因別の対応
      if (userAnswers.q4 === 'workload' && service.tags.includes('ワークライフバランス')) {
        score += 3
        reasons.push("労働時間の悩み解決")
      }
      
      if (userAnswers.q4 === 'content' && service.tags.includes('キャリアアップ')) {
        score += 3
        reasons.push("やりがいのある仕事へ")
      }
      
      if (userAnswers.q4 === 'relationships' && service.category.includes('退職代行')) {
        score += 2
        reasons.push("人間関係リセット")
      }

      if (userAnswers.q4 === 'future' && (service.tags.includes('スキルアップ') || service.category.includes('フリーランス'))) {
        score += 3
        reasons.push("将来不安の解消")
      }

      // Q5: 不安要因への対応
      if (userAnswers.q5 === 'financial' && service.category.includes('副業')) {
        score += 3
        reasons.push("収入安定化")
      }
      
      if (userAnswers.q5 === 'job_search' && service.category.includes('転職支援')) {
        score += 3
        reasons.push("転職活動を完全サポート")
      }
    }

    // === 自由記述に基づく追加スコアリング ===
    textAnalysis.keywords.forEach(keyword => {
      switch (keyword) {
        case 'IT':
          if (service.tags.includes('IT') || service.tags.includes('エンジニア')) {
            score += 4
            reasons.push("IT業界特化")
          }
          break
        case '成長志向':
          if (service.category.includes('スキルアップ') || service.category.includes('留学')) {
            score += 3
            reasons.push("スキルアップ重視")
          }
          break
        case '独立志向':
          if (service.category.includes('フリーランス') || service.category.includes('副業')) {
            score += 4
            reasons.push("独立への第一歩")
          }
          break
        case '働き方改善':
          if (service.tags.includes('ワークライフバランス') || service.category.includes('リゾートバイト')) {
            score += 3
            reasons.push("働き方改革")
          }
          break
        case '地方移住':
          if (service.category.includes('地方転職') || service.category.includes('リゾートバイト')) {
            score += 4
            reasons.push("地方ライフ実現")
          }
          break
        case '緊急性':
          if (service.category.includes('退職代行')) {
            score += 2 // 緊急性があっても退職代行を過度に優先しない
            reasons.push("緊急対応可能")
          }
          break
      }
    })

    // 感情に基づく調整
    if (textAnalysis.sentiment === 'negative' && service.category.includes('リゾートバイト')) {
      score += 2
      reasons.push("リフレッシュで心機一転")
    }

    // スコアが1以上のサービスのみ推奨
    if (score > 0) {
      recommendedServices.push({
        ...service,
        score,
        reason: reasons.slice(0, 2).join("・") || "あなたにおすすめ"
      })
    }
  })

  // 3. スコア順にソートして上位を返す
  return recommendedServices
    .sort((a, b) => b.score - a.score)
    .slice(0, 4) // 上位4つを推奨
}
