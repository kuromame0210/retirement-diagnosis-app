/**
 * V3診断システム - 質問フロー管理
 * 
 * 段階的診断システムの制御ロジック
 * - 途中診断タイミングの管理
 * - ユーザー体験の最適化
 * - AI分析への回答データ整形
 */

import { V3_QUESTIONS, getPartialDiagnosisConfig, getProgressInfo, type V3Question } from './questions'

// ============================================
// 診断フロー設定
// ============================================

export interface DiagnosisFlowConfig {
  // 途中診断の推奨タイミング
  suggestedPartialTiming: number[]
  
  // メッセージ表示設定
  encouragementMessages: Record<number, string>
  progressMessages: Record<number, string>
  
  // AI分析用重み設定
  analysisWeights: Record<string, number>
}

export const DIAGNOSIS_FLOW_CONFIG: DiagnosisFlowConfig = {
  // 3問、6問、9問完了時に途中診断を積極的に提案
  suggestedPartialTiming: [3, 6, 9],
  
  encouragementMessages: {
    1: '👏 最初の質問にお答えいただき、ありがとうございます！',
    3: '🎯 基本的な状況が見えてきました。ここでも診断できますが、より詳しい分析のために続けることをお勧めします。',
    5: '📊 あなたの価値観について理解が深まってきました。',
    7: '🔍 かなり詳細な分析が可能になりました！',
    9: '✨ もう少しで完了です。最終的な質問で、より具体的なアドバイスが可能になります。',
    10: '🎊 全ての質問が完了しました！最も正確で詳細な診断結果をお届けします。'
  },
  
  progressMessages: {
    3: 'ここまでの回答で基本的な診断が可能です',
    6: 'より詳細な分析結果を提供できるようになりました',
    9: '非常に高精度な診断が可能です',
    10: '最高精度での診断をお届けします'
  },
  
  // AI分析での各質問の重要度
  analysisWeights: {
    'q1_current_feeling': 10,      // 現在の感情（最重要）
    'q2_work_stress': 9,           // ストレス要因
    'q3_motivation_energy': 8,     // モチベーション
    'q4_ideal_work': 9,            // 理想の働き方
    'q5_career_concerns': 8,       // キャリアの不安
    'q6_skills_growth': 7,         // スキル成長
    'q7_work_life_balance': 6,     // ワークライフバランス
    'q8_company_culture': 7,       // 企業文化
    'q9_compensation_treatment': 6, // 待遇面
    'q10_action_readiness': 8      // 行動準備度
  }
}

// ============================================
// フロー状態管理
// ============================================

export interface QuestionFlowState {
  currentQuestionOrder: number
  answeredQuestions: number
  canShowPartialDiagnosis: boolean
  shouldSuggestPartialDiagnosis: boolean
  nextSuggestedTiming: number | null
  flowStage: 'starting' | 'basic' | 'detailed' | 'deep' | 'completed'
  userEngagement: 'high' | 'medium' | 'low'
}

/**
 * 現在のフロー状態を計算
 */
export function calculateFlowState(answeredQuestions: number, answers: Record<string, any>): QuestionFlowState {
  const progressInfo = getProgressInfo(answeredQuestions)
  const suggestedTimings = DIAGNOSIS_FLOW_CONFIG.suggestedPartialTiming
  
  // 次の推奨タイミングを検索
  const nextSuggestedTiming = suggestedTimings.find(timing => timing > answeredQuestions) || null
  
  // 現在のフロー段階を判定
  let flowStage: QuestionFlowState['flowStage']
  if (answeredQuestions === 0) flowStage = 'starting'
  else if (answeredQuestions <= 3) flowStage = 'basic'
  else if (answeredQuestions <= 6) flowStage = 'detailed'
  else if (answeredQuestions < 10) flowStage = 'deep'
  else flowStage = 'completed'
  
  // ユーザーのエンゲージメント判定（回答の詳細度から）
  const userEngagement = calculateUserEngagement(answers)
  
  return {
    currentQuestionOrder: answeredQuestions + 1,
    answeredQuestions,
    canShowPartialDiagnosis: answeredQuestions >= 1,
    shouldSuggestPartialDiagnosis: suggestedTimings.includes(answeredQuestions),
    nextSuggestedTiming,
    flowStage,
    userEngagement
  }
}

/**
 * ユーザーエンゲージメントを計算
 */
function calculateUserEngagement(answers: Record<string, any>): 'high' | 'medium' | 'low' {
  const answeredCount = Object.keys(answers).length
  if (answeredCount === 0) return 'medium'
  
  // 回答の平均文字数を計算
  const totalChars = Object.values(answers).reduce((sum: number, answer: any) => {
    return sum + (answer?.answer?.length || 0)
  }, 0)
  
  const avgChars = totalChars / answeredCount
  
  // エンゲージメント判定
  if (avgChars >= 50) return 'high'      // 詳細な回答
  if (avgChars >= 20) return 'medium'    // 適度な回答
  return 'low'                           // 簡潔な回答
}

// ============================================
// UI表示制御
// ============================================

export interface UIDisplayConfig {
  showPartialButton: boolean
  partialButtonText: string
  showProgressBar: boolean
  showEncouragement: boolean
  encouragementText?: string
  showProgressMessage: boolean
  progressMessage?: string
  showCautionMessage: boolean
  cautionMessage?: string
  nextButtonText: string
  showSkipOption: boolean
}

/**
 * UI表示設定を生成
 */
export function generateUIDisplayConfig(flowState: QuestionFlowState): UIDisplayConfig {
  const { answeredQuestions, shouldSuggestPartialDiagnosis, flowStage } = flowState
  const progressInfo = getProgressInfo(answeredQuestions)
  const partialConfig = getPartialDiagnosisConfig(answeredQuestions)
  
  // 基本設定
  const showPartialButton = flowState.canShowPartialDiagnosis
  const showEncouragement = DIAGNOSIS_FLOW_CONFIG.encouragementMessages[answeredQuestions] !== undefined
  const showProgressMessage = DIAGNOSIS_FLOW_CONFIG.progressMessages[answeredQuestions] !== undefined
  
  // 次のボタンテキスト
  let nextButtonText = '次の質問へ'
  if (flowStage === 'completed') nextButtonText = '最終診断を実行'
  else if (answeredQuestions >= 9) nextButtonText = '最後の質問へ'
  else if (shouldSuggestPartialDiagnosis) nextButtonText = 'さらに詳しく回答'
  
  return {
    showPartialButton,
    partialButtonText: partialConfig.buttonText,
    showProgressBar: true,
    showEncouragement,
    encouragementText: DIAGNOSIS_FLOW_CONFIG.encouragementMessages[answeredQuestions],
    showProgressMessage,
    progressMessage: DIAGNOSIS_FLOW_CONFIG.progressMessages[answeredQuestions],
    showCautionMessage: showPartialButton,
    cautionMessage: partialConfig.cautionMessage,
    nextButtonText,
    showSkipOption: answeredQuestions >= 6 && !V3_QUESTIONS[answeredQuestions]?.required
  }
}

// ============================================
// AI分析用データ整形
// ============================================

export interface AnalysisDataForAI {
  answeredQuestions: number
  totalQuestions: number
  confidenceLevel: 'low' | 'medium' | 'high'
  textAnswers: Array<{
    questionId: string
    question: string
    answer: string
    category: string
    analysisWeight: number
    characterCount: number
    answeredAt: string
  }>
  analysisMetadata: {
    userEngagement: 'high' | 'medium' | 'low'
    averageAnswerLength: number
    detailedAnswersCount: number
    totalCharacters: number
    responsePattern: 'detailed' | 'moderate' | 'brief'
  }
}

/**
 * AI分析用のデータを整形
 */
export function prepareDataForAI(
  answers: Record<string, any>, 
  flowState: QuestionFlowState
): AnalysisDataForAI {
  const progressInfo = getProgressInfo(flowState.answeredQuestions)
  
  // 回答データを整形
  const textAnswers = Object.entries(answers).map(([questionId, answerData]) => {
    const question = V3_QUESTIONS.find(q => q.id === questionId)
    return {
      questionId,
      question: question?.question || '',
      answer: answerData.answer || '',
      category: question?.category || 'unknown',
      analysisWeight: DIAGNOSIS_FLOW_CONFIG.analysisWeights[questionId] || 5,
      characterCount: answerData.answer?.length || 0,
      answeredAt: answerData.answeredAt || new Date().toISOString()
    }
  }).sort((a, b) => {
    // 質問の順序でソート
    const orderA = V3_QUESTIONS.find(q => q.id === a.questionId)?.order || 999
    const orderB = V3_QUESTIONS.find(q => q.id === b.questionId)?.order || 999
    return orderA - orderB
  })
  
  // メタデータ計算
  const totalCharacters = textAnswers.reduce((sum, answer) => sum + answer.characterCount, 0)
  const averageAnswerLength = totalCharacters / Math.max(textAnswers.length, 1)
  const detailedAnswersCount = textAnswers.filter(answer => answer.characterCount >= 50).length
  
  let responsePattern: 'detailed' | 'moderate' | 'brief'
  if (averageAnswerLength >= 60) responsePattern = 'detailed'
  else if (averageAnswerLength >= 25) responsePattern = 'moderate'
  else responsePattern = 'brief'
  
  return {
    answeredQuestions: flowState.answeredQuestions,
    totalQuestions: V3_QUESTIONS.length,
    confidenceLevel: progressInfo.currentConfig.confidenceLevel,
    textAnswers,
    analysisMetadata: {
      userEngagement: flowState.userEngagement,
      averageAnswerLength: Math.round(averageAnswerLength),
      detailedAnswersCount,
      totalCharacters,
      responsePattern
    }
  }
}

// ============================================
// セッション状態管理
// ============================================

export interface V3SessionState {
  sessionId: string
  userId: string
  flowState: QuestionFlowState
  answers: Record<string, any>
  partialDiagnosisHistory: any[]
  uiConfig: UIDisplayConfig
  lastUpdated: string
}

/**
 * セッション状態を更新
 */
export function updateSessionState(
  currentState: Partial<V3SessionState>,
  newAnswers: Record<string, any>
): V3SessionState {
  const mergedAnswers = { ...currentState.answers, ...newAnswers }
  const answeredCount = Object.keys(mergedAnswers).length
  const flowState = calculateFlowState(answeredCount, mergedAnswers)
  const uiConfig = generateUIDisplayConfig(flowState)
  
  return {
    sessionId: currentState.sessionId || '',
    userId: currentState.userId || '',
    flowState,
    answers: mergedAnswers,
    partialDiagnosisHistory: currentState.partialDiagnosisHistory || [],
    uiConfig,
    lastUpdated: new Date().toISOString()
  }
}