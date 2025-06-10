// v2用のサービス推奨ロジック（既存のservices.tsを使用）
import { V2Answers } from './questions'
import { services, ServiceInfo, RecommendedService } from '../services'

export interface V2RecommendedService extends ServiceInfo {
  rank: number
  score: number
  reason: string
  priority: "high" | "medium" | "low"
}

// v2回答に基づくサービス推奨ロジック（既存のservices.tsを使用）
export function recommendV2Services(answers: V2Answers): V2RecommendedService[] {
  console.log("=== recommendV2Services 開始 ===")
  console.log("使用するサービス数:", services.length)
  console.log("利用可能なサービス名:", services.map(s => s.name))
  
  const recommendations: Array<ServiceInfo & { score: number; reasons: string[] }> = []

  services.forEach(service => {
    let score = 0
    const reasons: string[] = []

    // 月曜日の朝の感情（satisfaction）に基づく推奨
    if (answers.satisfaction === "dread" || answers.satisfaction === "heavy") {
      if (service.category.includes("退職代行")) {
        score += 5
        reasons.push("緊急に環境を変える必要があります")
      }
      if (service.category.includes("転職支援")) {
        score += 4
        reasons.push("新しい環境での再スタートを支援")
      }
      if (service.urgencyLevel.includes("high")) {
        score += 3
        reasons.push("高緊急度対応サービス")
      }
    } else if (answers.satisfaction === "excited") {
      if (service.category.includes("スキルアップ") || service.category.includes("フリーランス")) {
        score += 3
        reasons.push("前向きなエネルギーを活かしてスキルアップ")
      }
    }

    // 夜の思考パターン（night_thoughts）に基づく推奨
    if (answers.night_thoughts === "escape_thoughts") {
      if (service.category.includes("退職代行") || service.category.includes("転職支援")) {
        score += 4
        reasons.push("逃げ出したい気持ちを前向きな行動に")
      }
      if (service.category.includes("リゾートバイト")) {
        score += 3
        reasons.push("環境を変えてリフレッシュ")
      }
    } else if (answers.night_thoughts === "skills_growth") {
      if (service.category.includes("スキルアップ") || service.category.includes("IT")) {
        score += 4
        reasons.push("成長意欲を具体的なスキルに")
      }
    }

    // 破綻ポイント（breaking_point）に基づく推奨
    if (answers.breaking_point?.includes("boss_unreasonable") || 
        answers.breaking_point?.includes("health_warning")) {
      if (service.category.includes("退職代行")) {
        score += 5
        reasons.push("有害な環境からの緊急脱出が必要")
      }
    }
    if (answers.breaking_point?.includes("salary_reality")) {
      if (service.category.includes("転職支援") || service.category.includes("フリーランス")) {
        score += 4
        reasons.push("収入改善の手段として")
      }
    }
    if (answers.breaking_point?.includes("skill_stagnation")) {
      if (service.category.includes("スキルアップ")) {
        score += 4
        reasons.push("スキル向上で成長実感を")
      }
    }

    // お金の現実（money_reality）に基づく推奨
    if (answers.money_reality === "barely_survive" || answers.money_reality === "no_luxury") {
      if (service.category.includes("副業")) {
        score += 4
        reasons.push("収入の柱を増やして安定化")
      }
      if (service.category.includes("転職支援")) {
        score += 3
        reasons.push("収入改善のための転職")
      }
    } else if (answers.money_reality === "comfortable" || answers.money_reality === "wealthy") {
      if (service.category.includes("スキルアップ") || service.category.includes("留学")) {
        score += 3
        reasons.push("経済的余裕を自己投資に")
      }
    }

    // 転職への本音（escape_plan）に基づく推奨
    if (answers.escape_plan === "immediate_quit") {
      if (service.category.includes("退職代行")) {
        score += 5
        reasons.push("今すぐ辞めたい気持ちをサポート")
      }
    } else if (answers.escape_plan === "planned_exit") {
      if (service.category.includes("転職支援")) {
        score += 4
        reasons.push("計画的な転職活動を支援")
      }
    } else if (answers.escape_plan === "improvement_first") {
      if (service.category.includes("スキルアップ")) {
        score += 3
        reasons.push("現職での改善も視野に入れたスキルアップ")
      }
    }

    // 理想の未来（ideal_future）に基づく推奨
    if (answers.ideal_future === "freelance_expert") {
      if (service.category.includes("フリーランス") || service.category.includes("IT")) {
        score += 4
        reasons.push("独立への道筋をサポート")
      }
    } else if (answers.ideal_future === "work_life_balance") {
      if (service.category.includes("地方転職") || service.category.includes("リゾートバイト")) {
        score += 3
        reasons.push("ワークライフバランス重視の働き方")
      }
    }

    // スキル自信度（skill_confidence）に基づく推奨
    if (answers.skill_confidence === "very_low" || answers.skill_confidence === "low_confidence") {
      if (service.category.includes("スキルアップ") || service.category.includes("就職支援")) {
        score += 4
        reasons.push("スキル向上で自信をつける")
      }
    } else if (answers.skill_confidence === "high_confidence") {
      if (service.category.includes("フリーランス")) {
        score += 3
        reasons.push("高いスキルを活かして独立")
      }
    }

    // 転職活動の覚悟（action_readiness）に基づく推奨
    if (answers.action_readiness === "serious_hunting" || answers.action_readiness === "active_preparation") {
      if (service.category.includes("転職支援")) {
        score += 4
        reasons.push("本格的な転職活動をサポート")
      }
    } else if (answers.action_readiness === "just_thinking" || answers.action_readiness === "not_ready") {
      if (service.category.includes("スキルアップ") || service.category.includes("副業")) {
        score += 3
        reasons.push("まずは情報収集・スキルアップから")
      }
    }

    // 職種による特別推奨
    if (answers.demographics.job === "it_tech") {
      if (service.category.includes("IT") || service.category.includes("フリーランス")) {
        score += 3
        reasons.push("IT業界専門サービス")
      }
    }

    // 人間関係の現実による推奨
    if (answers.relationship_reality === "toxic_environment") {
      if (service.category.includes("退職代行") || service.category.includes("転職支援")) {
        score += 4
        reasons.push("有害な人間関係からの脱出")
      }
    }

    // スコアが2以上のサービスのみ推奨対象
    if (score >= 2) {
      recommendations.push({
        ...service,
        score,
        reasons
      })
    }
  })

  // スコア順にソートして上位5つを選定
  const sortedRecommendations = recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  // 最終的な推奨サービスリストを作成
  const finalRecommendations = sortedRecommendations.map((rec, index) => ({
    ...rec,
    rank: index + 1,
    reason: rec.reasons.slice(0, 2).join("・") || "あなたにおすすめ",
    priority: index < 2 ? "high" : index < 4 ? "medium" : "low"
  }))
  
  console.log("=== 最終推奨サービス結果 ===")
  console.log("推奨サービス数:", finalRecommendations.length)
  console.log("推奨サービス名:", finalRecommendations.map(s => s.name))
  
  return finalRecommendations
}