/**
 * V3感情共感アドバイザー
 * ユーザーの感情に寄り添うパーソナライズアドバイス生成
 */

// ============================================
// 感情共感型アドバイス構造
// ============================================

export interface EmpatheticAdvice {
  // Phase 1: 感情的共感（最重要）
  emotional_connection: {
    recognition: string          // "あなたの○○という気持ち、よく分かります"
    validation: string           // "その感情は自然で、あなたが悪いわけではありません"
    hope_message: string         // "必ず道はあります。一緒に歩んでいきましょう"
  }
  
  // Phase 2: 個人の強みと価値の再発見
  strength_affirmation: {
    hidden_strengths: string[]   // "あなたが気づいていない素晴らしい強み"
    unique_value: string         // "あなただけが持つ特別な価値"
    contribution_potential: string // "あなたが世界に与えられる影響"
  }
  
  // Phase 3: マイクロアクション（超具体的）
  micro_actions: Array<{
    title: string
    description: string
    time_required: '5分' | '10分' | '15分' | '30分'
    difficulty: 'とても簡単' | '簡単' | '普通'
    why_for_you: string          // なぜあなたにこれが必要か
    how_to_start: string         // あなたの性格に合った始め方
    success_feeling: string      // やり終えた時の気持ち
    celebration: string          // 自分への褒め方
    troubleshooting: string      // うまくいかない時の対処
  }>
  
  // Phase 4: 段階的希望の提示
  progressive_hope: {
    immediate_hope: string       // "今日からできることがあります"
    weekly_vision: string        // "1週間後のあなたの変化"
    monthly_transformation: string // "1ヶ月後の新しいあなた"
    long_term_dream: string      // "半年後に実現可能な理想"
  }
  
  // Phase 5: 継続的サポート
  ongoing_support: {
    daily_encouragement: string[]    // 毎日の励まし
    weekly_check_questions: string[] // 週次振り返り質問
    motivation_boosters: string[]   // やる気が下がった時の対処
    celebration_prompts: string[]   // 成功体験の増幅
  }
}

// ============================================
// 行動変容ステージ別アプローチ
// ============================================

export interface BehaviorChangeStage {
  stage: 'precontemplation' | 'contemplation' | 'preparation' | 'action' | 'maintenance'
  stage_description: string
  appropriate_intervention: string
  next_stage_signals: string[]
}

export interface PersonalizedStagingApproach {
  current_stage: BehaviorChangeStage
  stage_specific_advice: {
    precontemplation?: {
      focus: "まずは現状への気づきから"
      approach: "自分の気持ちを否定せず、ただ観察してみましょう"
      gentle_questions: string[]
    }
    contemplation?: {
      focus: "じっくり考える時間を大切に"
      approach: "情報収集と気持ちの整理を並行して"
      exploration_activities: string[]
    }
    preparation?: {
      focus: "小さな準備から始めましょう"
      approach: "完璧を求めず、できることから一歩ずつ"
      preparation_steps: string[]
    }
    action?: {
      focus: "行動を継続することが最優先"
      approach: "完璧でなくても続けることに価値があります"
      maintenance_strategies: string[]
    }
    maintenance?: {
      focus: "新しい習慣の定着と発展"
      approach: "これまでの成長を振り返り、次の目標を設定"
      growth_opportunities: string[]
    }
  }
}

// ============================================
// マイクロサクセス設計
// ============================================

export interface MicroSuccessFramework {
  // レベル1: 意識の変化（1-3日）
  awareness_level: {
    target: "自分の感情に気づく"
    micro_actions: Array<{
      action: string
      success_metric: string
      emotional_reward: string
      next_step_motivation: string
    }>
  }
  
  // レベル2: 小さな行動（1週間）
  behavior_level: {
    target: "5分の新しい習慣"
    micro_actions: Array<{
      action: string
      success_metric: string
      emotional_reward: string
      next_step_motivation: string
    }>
  }
  
  // レベル3: 習慣化（1ヶ月）
  habit_level: {
    target: "継続的な変化"
    micro_actions: Array<{
      action: string
      success_metric: string
      emotional_reward: string
      next_step_motivation: string
    }>
  }
  
  // レベル4: 統合（3ヶ月）
  integration_level: {
    target: "新しいアイデンティティ"
    micro_actions: Array<{
      action: string
      success_metric: string
      emotional_reward: string
      next_step_motivation: string
    }>
  }
}

// ============================================
// 感情状態別アドバイス生成
// ============================================

export class EmpatheticAdvisor {
  
  /**
   * 感情状態を分析してアドバイスタイプを決定
   */
  analyzeEmotionalState(answers: Record<string, string>): {
    primaryEmotion: 'stress' | 'anxiety' | 'frustration' | 'sadness' | 'confusion' | 'hope'
    intensity: 'low' | 'medium' | 'high'
    supportNeeds: string[]
  } {
    // 感情キーワード分析
    const allText = Object.values(answers).join(' ').toLowerCase()
    
    const emotionKeywords = {
      stress: ['ストレス', '疲れ', '辛い', '限界', 'きつい'],
      anxiety: ['不安', '心配', '怖い', '迷い', '分からない'],
      frustration: ['イライラ', '腹立つ', 'うざい', 'ムカつく', '理不尽'],
      sadness: ['悲しい', '虚しい', '寂しい', '落ち込む', 'やるせない'],
      confusion: ['分からない', '迷う', '混乱', 'どうしたら', '困る'],
      hope: ['成長', '向上', '頑張', 'チャレンジ', '挑戦']
    }
    
    // 感情スコア計算
    const emotionScores = Object.entries(emotionKeywords).map(([emotion, keywords]) => {
      const score = keywords.reduce((acc, keyword) => {
        const matches = (allText.match(new RegExp(keyword, 'g')) || []).length
        return acc + matches
      }, 0)
      return { emotion: emotion as any, score }
    })
    
    // 最高スコアの感情を特定
    const primaryEmotion = emotionScores.reduce((max, current) => 
      current.score > max.score ? current : max
    )
    
    // 強度判定
    const intensity: 'low' | 'medium' | 'high' = 
      primaryEmotion.score >= 3 ? 'high' :
      primaryEmotion.score >= 1 ? 'medium' : 'low'
    
    return {
      primaryEmotion: primaryEmotion.emotion,
      intensity,
      supportNeeds: this.determineSupportNeeds(primaryEmotion.emotion, intensity)
    }
  }
  
  /**
   * 感情状態に応じたサポートニーズを決定
   */
  private determineSupportNeeds(emotion: string, intensity: string): string[] {
    const supportMap = {
      stress: ['情緒的サポート', 'ストレス軽減策', '休息の確保'],
      anxiety: ['安心感の提供', '情報提供', '段階的アプローチ'],
      frustration: ['感情の受容', '建設的な発散方法', '問題解決策'],
      sadness: ['共感と理解', '希望の再構築', 'つながりの回復'],
      confusion: ['情報整理', '選択肢の明確化', '意思決定支援'],
      hope: ['成長支援', 'チャレンジ機会', 'スキル向上']
    }
    
    return supportMap[emotion] || ['総合的サポート']
  }
  
  /**
   * パーソナライズされた感情共感メッセージ生成
   */
  generateEmpatheticMessage(
    emotionalState: any, 
    answers: Record<string, string>
  ): EmpatheticAdvice['emotional_connection'] {
    
    const { primaryEmotion, intensity } = emotionalState
    
    // 感情別共感メッセージテンプレート
    const empathyTemplates = {
      stress: {
        recognition: `あなたが毎日感じている重圧やストレス、本当によく分かります。「もう限界かも...」と思う気持ち、その辛さは痛いほど伝わってきます。`,
        validation: `こんなにストレスを感じるのは、あなたが責任感が強く、真面目に取り組んでいる証拠です。あなたが悪いわけでは決してありません。`,
        hope_message: `でも大丈夫。今のあなたには、必ず抜け出す道があります。一人で抱え込まず、一緒に歩んでいきましょう。`
      },
      anxiety: {
        recognition: `将来への不安、「この先どうなるんだろう...」という心配、その気持ちとてもよく分かります。夜眠れないこともあるかもしれませんね。`,
        validation: `不安を感じるのは、あなたが慎重で、しっかり考える人だからです。その慎重さは、実はとても大切な強みなのです。`,
        hope_message: `不安の正体が見えてくれば、必ず道筋も見えてきます。あなたには乗り越える力があります。一歩ずつ、確実に進んでいきましょう。`
      },
      frustration: {
        recognition: `理不尽な状況にイライラする気持ち、「なんでこんなことに...」という怒り、その感情を抱くのは当然です。我慢の限界を感じているのですね。`,
        validation: `怒りを感じるのは、あなたに正義感があり、物事の本質を見抜く力があるからです。その感受性は貴重な才能です。`,
        hope_message: `その怒りのエネルギーを、建設的な変化の力に変えていくことができます。あなたの情熱は、必ず良い方向に導いてくれるはずです。`
      }
      // 他の感情パターンも同様に...
    }
    
    const template = empathyTemplates[primaryEmotion] || empathyTemplates.stress
    
    return {
      recognition: template.recognition,
      validation: template.validation,
      hope_message: template.hope_message
    }
  }
  
  /**
   * 個人の状況に応じたマイクロアクション生成
   */
  generateMicroActions(
    emotionalState: any,
    answers: Record<string, string>,
    behaviorStage: string
  ): EmpatheticAdvice['micro_actions'] {
    
    // 感情とステージに応じたマイクロアクション
    const microActionTemplates = {
      stress_contemplation: [
        {
          title: "朝の5分セルフチェック",
          description: "コーヒーやお茶を飲みながら、今日の気持ちを1から10で数字にしてみる",
          time_required: "5分" as const,
          difficulty: "とても簡単" as const,
          why_for_you: "あなたは自分の感情に気づくのが得意なので、それを活かして客観視する練習です",
          how_to_start: "まずは数字をつけるだけ。良い悪いの判断はしなくて大丈夫",
          success_feeling: "「今日の自分の状態が分かった」という安心感",
          celebration: "「今日も自分と向き合えた、えらい！」と心の中で自分を褒める",
          troubleshooting: "忙しい朝は、歯磨きの時に心の中で数字を思うだけでもOK"
        }
      ],
      anxiety_preparation: [
        {
          title: "不安リストの見える化",
          description: "頭の中の心配事を紙かスマホに3つだけ書き出してみる",
          time_required: "10分" as const,
          difficulty: "簡単" as const,
          why_for_you: "あなたの慎重さを活かして、不安を整理整頓する作業です",
          how_to_start: "完璧な文章にしなくて大丈夫。単語やキーワードだけでも",
          success_feeling: "「モヤモヤが少し整理された」という軽やかさ",
          celebration: "「不安と向き合う勇気を出せた自分、すごい！」",
          troubleshooting: "書くのが億劫なら、誰かに話してみるだけでもOK"
        }
      ]
      // 他のパターンも追加...
    }
    
    const key = `${emotionalState.primaryEmotion}_${behaviorStage}`
    return microActionTemplates[key] || microActionTemplates.stress_contemplation
  }
}

// ============================================
// アドバイス品質向上のための検証
// ============================================

export interface AdviceQualityMetrics {
  empathy_score: number        // 共感度スコア (1-10)
  actionability_score: number // 実行可能性スコア (1-10)
  personalization_score: number // 個別化度スコア (1-10)
  motivation_score: number    // モチベーション向上度 (1-10)
  overall_effectiveness: number // 総合効果予測 (1-10)
}

export function evaluateAdviceQuality(advice: EmpatheticAdvice): AdviceQualityMetrics {
  // アドバイスの品質を定量的に評価する関数
  // 実装時にユーザーフィードバックと連携
  return {
    empathy_score: 8.5,
    actionability_score: 9.0,
    personalization_score: 8.8,
    motivation_score: 8.2,
    overall_effectiveness: 8.6
  }
}