/**
 * V3診断システム - 質問設計
 * 
 * 特徴:
 * - 全10問すべてテキスト回答
 * - 段階的な深掘り構造
 * - 途中診断対応（1問目から診断可能）
 * - AI分析最適化された質問設計
 */

export interface V3Question {
  id: string
  order: number
  question: string
  placeholder: string
  description?: string
  required: boolean
  minLength: number
  maxLength: number
  category: 'basic' | 'detailed' | 'deep'
  analysisWeight: number  // AI分析での重要度 (1-10)
  partialDiagnosisRelevance: number  // 途中診断での関連度 (1-10)
}

export const V3_QUESTIONS: V3Question[] = [
  // ============================================
  // 基本層（1-3問）: 現状把握
  // 途中診断精度: 低（30-40%）
  // ============================================
  {
    id: 'q1_text',
    order: 1,
    question: '今の仕事について、率直にどう感じていますか？',
    placeholder: '例：毎朝会社に行くのが辛い、やりがいを感じられない、人間関係に疲れた、成長を感じられない...など、思っていることを自由に書いてください',
    description: 'あなたの現在の感情や状況を教えてください。どんな些細なことでも構いません。',
    required: true,
    minLength: 10,
    maxLength: 500,
    category: 'basic',
    analysisWeight: 10,  // 最重要
    partialDiagnosisRelevance: 10
  },
  {
    id: 'q2_text',
    order: 2,
    question: '仕事で最もストレスを感じるのはどのような時ですか？具体的なエピソードがあれば教えてください。',
    placeholder: '例：上司からの理不尽な指示、残業が続く時、成果が評価されない時、同僚との関係、プレッシャーを感じる場面...など',
    description: 'ストレス要因を特定することで、解決策を見つけやすくなります。',
    required: true,
    minLength: 15,
    maxLength: 600,
    category: 'basic',
    analysisWeight: 9,
    partialDiagnosisRelevance: 9
  },
  {
    id: 'q3_text',
    order: 3,
    question: '朝起きた時、仕事に対するモチベーションやエネルギーはどの程度ありますか？最近の変化も含めて教えてください。',
    placeholder: '例：全くやる気が出ない、以前はあったが最近は...、プロジェクトによって違う、月曜日が特に辛い...など',
    description: 'モチベーションの状態は、キャリアの方向性を考える重要な指標です。',
    required: true,
    minLength: 10,
    maxLength: 400,
    category: 'basic',
    analysisWeight: 8,
    partialDiagnosisRelevance: 8
  },

  // ============================================
  // 詳細層（4-6問）: 価値観・目標の深掘り
  // 途中診断精度: 中（60-70%）
  // ============================================
  {
    id: 'q4_text',
    order: 4,
    question: 'あなたにとって理想的な働き方や仕事環境はどのようなものですか？現在との違いも含めて詳しく教えてください。',
    placeholder: '例：リモートワーク中心、クリエイティブな仕事、チームワークを重視、自分のペースで働ける、成長できる環境、ワークライフバランス...など',
    description: '理想と現実のギャップを明確にすることで、今後の方向性が見えてきます。',
    required: true,
    minLength: 20,
    maxLength: 700,
    category: 'detailed',
    analysisWeight: 9,
    partialDiagnosisRelevance: 7
  },
  {
    id: 'q5_text',
    order: 5,
    question: '現在のキャリアで最も不安に感じていることは何ですか？将来への懸念も含めて教えてください。',
    placeholder: '例：スキルアップできない、将来性に不安、年収が上がらない、転職のタイミング、年齢的な不安、業界の将来性...など',
    description: '不安要素を整理することで、優先的に対処すべき課題が明確になります。',
    required: true,
    minLength: 15,
    maxLength: 600,
    category: 'detailed',
    analysisWeight: 8,
    partialDiagnosisRelevance: 6
  },
  {
    id: 'q6_text',
    order: 6,
    question: '今後身につけたいスキルや成長したい分野はありますか？現在の業務との関連性も教えてください。',
    placeholder: '例：プログラミング、マネジメント、語学、デザイン、営業スキル、現在の仕事では学べない分野に興味がある...など',
    description: 'スキルアップの方向性により、転職か現職での成長かの判断材料になります。',
    required: true,
    minLength: 10,
    maxLength: 500,
    category: 'detailed',
    analysisWeight: 7,
    partialDiagnosisRelevance: 5
  },

  // ============================================
  // 深層層（7-10問）: 具体的行動・決断要因
  // 途中診断精度: 高（80-90%）
  // ============================================
  {
    id: 'q7_text',
    order: 7,
    question: 'ワークライフバランスについて、現在の状況と理想のバランスを教えてください。プライベートの時間は十分取れていますか？',
    placeholder: '例：残業が多すぎて疲れている、土日も仕事のことを考えてしまう、家族との時間を大切にしたい、趣味の時間がない...など',
    description: 'ワークライフバランスは、キャリア選択の重要な判断基準の一つです。',
    required: false,
    minLength: 10,
    maxLength: 500,
    category: 'deep',
    analysisWeight: 6,
    partialDiagnosisRelevance: 4
  },
  {
    id: 'q8_text',
    order: 8,
    question: '現在の職場の雰囲気や企業文化について、どのように感じていますか？自分に合っていると思いますか？',
    placeholder: '例：風通しが悪い、古い体質、競争が激しすぎる、逆にぬるすぎる、価値観が合わない、人間関係が複雑...など',
    description: '企業文化とのマッチングは、長期的な満足度に大きく影響します。',
    required: false,
    minLength: 10,
    maxLength: 500,
    category: 'deep',
    analysisWeight: 7,
    partialDiagnosisRelevance: 3
  },
  {
    id: 'q9_text',
    order: 9,
    question: '給与や待遇面で感じていることがあれば教えてください。市場価値や同年代との比較での思いも含めて。',
    placeholder: '例：給与が低すぎる、昇進が見込めない、福利厚生が不十分、同年代と比べて劣っている、評価制度に不満...など',
    description: '待遇面の不満は、転職を考える大きな要因の一つです。率直にお聞かせください。',
    required: false,
    minLength: 5,
    maxLength: 400,
    category: 'deep',
    analysisWeight: 6,
    partialDiagnosisRelevance: 2
  },
  {
    id: 'q10_text',
    order: 10,
    question: '現状を変えるために、どの程度行動を起こす準備ができていますか？具体的に考えていることがあれば教えてください。',
    placeholder: '例：すぐにでも転職したい、まずは情報収集から、社内での部署異動を検討、副業を始めたい、スキルアップの勉強中...など',
    description: '行動の準備度合いにより、最適なアドバイスの内容が変わります。',
    required: false,
    minLength: 10,
    maxLength: 500,
    category: 'deep',
    analysisWeight: 8,
    partialDiagnosisRelevance: 1
  }
]

// ============================================
// 途中診断の精度設定
// ============================================

export interface PartialDiagnosisConfig {
  minQuestions: number
  maxQuestions: number
  confidenceLevel: 'low' | 'medium' | 'high'
  accuracyPercentage: string
  buttonText: string
  cautionMessage: string
  canDoFinalDiagnosis: boolean
  finalDiagnosisButtonText?: string
  finalDiagnosisCaution?: string
}

export const PARTIAL_DIAGNOSIS_CONFIG: PartialDiagnosisConfig[] = [
  {
    minQuestions: 1,
    maxQuestions: 1,
    confidenceLevel: 'low',
    accuracyPercentage: '30-40%',
    buttonText: '現在の回答で診断する（精度：低）',
    cautionMessage: '最後まで答えると、より正確で詳細な診断結果が得られます（推奨）',
    canDoFinalDiagnosis: false
  },
  {
    minQuestions: 2,
    maxQuestions: 3,
    confidenceLevel: 'low',
    accuracyPercentage: '40-50%',
    buttonText: '現在の回答で診断する（精度：低）',
    cautionMessage: '最後まで答えると、より正確で詳細な診断結果が得られます（推奨）',
    canDoFinalDiagnosis: true,
    finalDiagnosisButtonText: '最終診断を実行する（簡易版）',
    finalDiagnosisCaution: '2-3問の回答で最終診断を行います。より詳細な診断には全問回答を推奨します。'
  },
  {
    minQuestions: 4,
    maxQuestions: 6,
    confidenceLevel: 'medium',
    accuracyPercentage: '60-70%',
    buttonText: '現在の回答で診断する（精度：中）',
    cautionMessage: 'あと数問答えると、さらに精度の高い診断結果が得られます',
    canDoFinalDiagnosis: true,
    finalDiagnosisButtonText: '最終診断を実行する（標準版）',
    finalDiagnosisCaution: '十分な情報で最終診断を行います。さらに詳細な分析には全問回答を推奨します。'
  },
  {
    minQuestions: 7,
    maxQuestions: 9,
    confidenceLevel: 'high',
    accuracyPercentage: '80-90%',
    buttonText: '現在の回答で診断する（精度：高）',
    cautionMessage: '残り少しです！最後まで答えると最も正確な結果が得られます',
    canDoFinalDiagnosis: true,
    finalDiagnosisButtonText: '最終診断を実行する（詳細版）',
    finalDiagnosisCaution: '高精度な最終診断を行います。'
  },
  {
    minQuestions: 10,
    maxQuestions: 10,
    confidenceLevel: 'high',
    accuracyPercentage: '95%+',
    buttonText: '最終診断を実行する（完全版）',
    cautionMessage: '全ての質問にお答えいただき、ありがとうございます！',
    canDoFinalDiagnosis: true,
    finalDiagnosisButtonText: '最終診断を実行する（完全版）',
    finalDiagnosisCaution: '全問回答による最高精度の診断を行います。'
  }
]

// ============================================
// 質問カテゴリ別設定
// ============================================

export const QUESTION_CATEGORIES = {
  basic: {
    name: '基本情報',
    description: '現在の状況と感情の把握',
    color: 'bg-red-100 text-red-800',
    icon: '📝'
  },
  detailed: {
    name: '詳細分析',
    description: '価値観と目標の深掘り',
    color: 'bg-yellow-100 text-yellow-800',
    icon: '🔍'
  },
  deep: {
    name: '深層分析',
    description: '具体的行動と決断要因',
    color: 'bg-green-100 text-green-800',
    icon: '💭'
  }
} as const

// ============================================
// ユーティリティ関数
// ============================================

/**
 * 回答済み質問数に基づいて現在の診断設定を取得
 */
export function getPartialDiagnosisConfig(answeredQuestions: number): PartialDiagnosisConfig {
  for (const config of PARTIAL_DIAGNOSIS_CONFIG) {
    if (answeredQuestions >= config.minQuestions && answeredQuestions <= config.maxQuestions) {
      return config
    }
  }
  return PARTIAL_DIAGNOSIS_CONFIG[0] // フォールバック
}

/**
 * 質問IDから質問オブジェクトを取得
 */
export function getQuestionById(questionId: string): V3Question | undefined {
  return V3_QUESTIONS.find(q => q.id === questionId)
}

/**
 * 回答済み質問数に基づいて次の質問を取得
 */
export function getNextQuestion(answeredQuestions: number): V3Question | null {
  const nextOrder = answeredQuestions + 1
  return V3_QUESTIONS.find(q => q.order === nextOrder) || null
}

/**
 * 現在の質問の進行状況を取得
 */
export function getProgressInfo(answeredQuestions: number) {
  const totalQuestions = V3_QUESTIONS.length
  const progressPercentage = Math.round((answeredQuestions / totalQuestions) * 100)
  const config = getPartialDiagnosisConfig(answeredQuestions)
  
  return {
    answeredQuestions,
    totalQuestions,
    progressPercentage,
    canDiagnose: answeredQuestions >= 1,
    canDoFinalDiagnosis: config.canDoFinalDiagnosis,
    isCompleted: answeredQuestions >= totalQuestions,
    currentConfig: config
  }
}

/**
 * 最終診断が可能かどうかをチェック
 */
export function canPerformFinalDiagnosis(answeredQuestions: number): boolean {
  const config = getPartialDiagnosisConfig(answeredQuestions)
  return config.canDoFinalDiagnosis
}

/**
 * 最終診断ボタンのテキストと説明を取得
 */
export function getFinalDiagnosisInfo(answeredQuestions: number): {
  canPerform: boolean
  buttonText: string
  cautionMessage: string
  accuracyLevel: string
} {
  const config = getPartialDiagnosisConfig(answeredQuestions)
  
  if (!config.canDoFinalDiagnosis) {
    return {
      canPerform: false,
      buttonText: '最終診断（2問以上で利用可能）',
      cautionMessage: '最終診断を行うには、最低2問の回答が必要です。',
      accuracyLevel: 'unavailable'
    }
  }
  
  return {
    canPerform: true,
    buttonText: config.finalDiagnosisButtonText || '最終診断を実行する',
    cautionMessage: config.finalDiagnosisCaution || '現在の回答で最終診断を行います。',
    accuracyLevel: config.accuracyPercentage
  }
}

/**
 * 必須質問がすべて回答されているかチェック
 */
export function validateRequiredQuestions(answers: Record<string, any>): {
  isValid: boolean
  missingRequired: string[]
} {
  const requiredQuestions = V3_QUESTIONS.filter(q => q.required)
  const missingRequired: string[] = []
  
  for (const question of requiredQuestions) {
    if (!answers[question.id] || !answers[question.id].answer?.trim()) {
      missingRequired.push(question.id)
    }
  }
  
  return {
    isValid: missingRequired.length === 0,
    missingRequired
  }
}

/**
 * 文字数制限チェック
 */
export function validateAnswerLength(questionId: string, answer: string): {
  isValid: boolean
  error?: string
} {
  const question = getQuestionById(questionId)
  if (!question) {
    return { isValid: false, error: '質問が見つかりません' }
  }
  
  const length = answer.trim().length
  
  if (length < question.minLength) {
    return { 
      isValid: false, 
      error: `${question.minLength}文字以上で入力してください（現在: ${length}文字）` 
    }
  }
  
  if (length > question.maxLength) {
    return { 
      isValid: false, 
      error: `${question.maxLength}文字以内で入力してください（現在: ${length}文字）` 
    }
  }
  
  return { isValid: true }
}