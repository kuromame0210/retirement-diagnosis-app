// lib/serviceRecommendation.ts
import { services, ServiceInfo, RecommendedService } from './services'

interface DiagnosisResult {
  finalType: string
  urgencyLevel: string
  currentSituation: string
  // 他の診断結果フィールド...
}

export function recommendServices(
  diagnosisResult: DiagnosisResult,
  userAnswers?: any
): RecommendedService[] {
  const recommendedServices: RecommendedService[] = []

  // 1. 緊急度とタイプでフィルタリング
  const filteredServices = services.filter(service => {
    const typeMatch = service.targetType.some(type => 
      diagnosisResult.finalType.includes(type)
    )
    const urgencyMatch = service.urgencyLevel.includes(diagnosisResult.urgencyLevel)
    
    return typeMatch || urgencyMatch // どちらかがマッチすればOK
  })

  // 2. 各サービスにスコアを付けて推奨リストを作成
  filteredServices.forEach(service => {
    let score = 0
    let reason = ""
    
    // 基本スコア
    if (service.targetType.some(type => diagnosisResult.finalType.includes(type))) {
      score += 3
      reason += "あなたのタイプにぴったり！ "
    }
    if (service.urgencyLevel.includes(diagnosisResult.urgencyLevel)) {
      score += 2
      reason += "今の状況に合ってます〜 "
    }
    
    // 回答内容に基づく追加スコア
    if (userAnswers) {
      // 残業がストレス要因の場合
      if (userAnswers.q4?.includes('残業') && service.tags.includes('ワークライフバランス')) {
        score += 2
        reason += "残業の悩み解決に〜 "
      }
      
      // すぐに辞めたい場合
      if (userAnswers.q1?.includes('辞めたい') && service.category.includes('退職代行')) {
        score += 3
        reason += "今すぐの退職をサポート！ "
      }
      
      // 成長したい場合
      if (userAnswers.q1?.includes('成長') && service.tags.includes('スキルアップ')) {
        score += 2
        reason += "スキルアップに最適！ "
      }
      
      // ITエンジニア関連
      if (userAnswers.q4?.includes('技術') && service.tags.includes('IT')) {
        score += 2
        reason += "IT業界に特化してます〜 "
      }
    }

    // スコアが1以上のサービスのみ推奨
    if (score > 0) {
      recommendedServices.push({
        ...service,
        score,
        reason: reason.trim() || "あなたにおすすめです〜"
      })
    }
  })

  // 3. スコア順にソートして上位を返す
  return recommendedServices
    .sort((a, b) => b.score - a.score)
    .slice(0, 4) // 上位4つを推奨
}
