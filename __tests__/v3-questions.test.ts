/**
 * V3質問設計とユーティリティ関数のテスト
 */

import {
  V3_QUESTIONS,
  getQuestionById,
  getPartialDiagnosisConfig,
  validateAnswerLength,
  validateRequiredQuestions,
  getProgressInfo,
  getNextQuestion,
  PARTIAL_DIAGNOSIS_CONFIG,
  QUESTION_CATEGORIES
} from '@/lib/v3/questions'

describe('V3 Questions System', () => {
  describe('V3_QUESTIONS constant', () => {
    it('should have exactly 10 questions', () => {
      expect(V3_QUESTIONS).toHaveLength(10)
    })

    it('should have correct question IDs and order', () => {
      const expectedIds = [
        'q1_current_feeling',
        'q2_work_stress', 
        'q3_motivation_energy',
        'q4_ideal_work',
        'q5_career_concerns',
        'q6_skills_growth',
        'q7_work_life_balance',
        'q8_company_culture',
        'q9_compensation_treatment',
        'q10_action_readiness'
      ]

      V3_QUESTIONS.forEach((question, index) => {
        expect(question.id).toBe(expectedIds[index])
        expect(question.order).toBe(index + 1)
      })
    })

    it('should have appropriate categories distribution', () => {
      const basicQuestions = V3_QUESTIONS.filter(q => q.category === 'basic')
      const detailedQuestions = V3_QUESTIONS.filter(q => q.category === 'detailed')
      const deepQuestions = V3_QUESTIONS.filter(q => q.category === 'deep')

      expect(basicQuestions.length).toBe(3) // 基本情報：Q1-Q3
      expect(detailedQuestions.length).toBe(3) // 詳細分析：Q4-Q6
      expect(deepQuestions.length).toBe(4) // 深層分析：Q7-Q10
    })

    it('should have required analysis weights and relevance scores', () => {
      V3_QUESTIONS.forEach(question => {
        expect(question.analysisWeight).toBeGreaterThanOrEqual(1)
        expect(question.analysisWeight).toBeLessThanOrEqual(10)
        expect(question.partialDiagnosisRelevance).toBeGreaterThanOrEqual(1)
        expect(question.partialDiagnosisRelevance).toBeLessThanOrEqual(10)
      })
    })

    it('should have valid placeholder text for all questions', () => {
      V3_QUESTIONS.forEach(question => {
        expect(question.placeholder).toBeDefined()
        expect(question.placeholder.length).toBeGreaterThan(10)
        expect(question.placeholder).toContain('例：')
      })
    })
  })

  describe('getQuestionById', () => {
    it('should return correct question by ID', () => {
      const question = getQuestionById('q1_current_feeling')
      
      expect(question).toBeDefined()
      expect(question?.id).toBe('q1_current_feeling')
      expect(question?.order).toBe(1)
      expect(question?.category).toBe('basic')
    })

    it('should return undefined for non-existent ID', () => {
      const question = getQuestionById('nonexistent_question')
      expect(question).toBeUndefined()
    })

    it('should handle empty string ID', () => {
      const question = getQuestionById('')
      expect(question).toBeUndefined()
    })
  })

  describe('getPartialDiagnosisConfig', () => {
    it('should return low confidence config for early questions (1-3)', () => {
      expect(getPartialDiagnosisConfig(1).confidenceLevel).toBe('low')
      expect(getPartialDiagnosisConfig(2).confidenceLevel).toBe('low')
      expect(getPartialDiagnosisConfig(3).confidenceLevel).toBe('low')
    })

    it('should return medium confidence config for middle questions (4-6)', () => {
      expect(getPartialDiagnosisConfig(4).confidenceLevel).toBe('medium')
      expect(getPartialDiagnosisConfig(5).confidenceLevel).toBe('medium')
      expect(getPartialDiagnosisConfig(6).confidenceLevel).toBe('medium')
    })

    it('should return high confidence config for later questions (7-10)', () => {
      expect(getPartialDiagnosisConfig(7).confidenceLevel).toBe('high')
      expect(getPartialDiagnosisConfig(8).confidenceLevel).toBe('high')
      expect(getPartialDiagnosisConfig(9).confidenceLevel).toBe('high')
      expect(getPartialDiagnosisConfig(10).confidenceLevel).toBe('high')
    })

    it('should handle edge cases', () => {
      expect(getPartialDiagnosisConfig(0).confidenceLevel).toBe('low')
      expect(getPartialDiagnosisConfig(-1).confidenceLevel).toBe('low')
      expect(getPartialDiagnosisConfig(15).confidenceLevel).toBe('low')
    })
  })

  describe('PARTIAL_DIAGNOSIS_CONFIG', () => {
    it('should have correct configuration structure', () => {
      expect(PARTIAL_DIAGNOSIS_CONFIG).toHaveLength(4)
      
      const lowConfig = PARTIAL_DIAGNOSIS_CONFIG[0]
      expect(lowConfig.confidenceLevel).toBe('low')
      expect(lowConfig.accuracyPercentage).toBe('30-40%')
      
      const highConfig = PARTIAL_DIAGNOSIS_CONFIG[2]
      expect(highConfig.confidenceLevel).toBe('high')
      expect(highConfig.accuracyPercentage).toBe('80-90%')
    })

    it('should have logical progression', () => {
      for (let i = 0; i < PARTIAL_DIAGNOSIS_CONFIG.length - 1; i++) {
        const current = PARTIAL_DIAGNOSIS_CONFIG[i]
        const next = PARTIAL_DIAGNOSIS_CONFIG[i + 1]
        expect(current.maxQuestions).toBeLessThan(next.minQuestions)
      }
    })
  })

  describe('validateAnswerLength', () => {
    it('should validate correct answer length', () => {
      const result = validateAnswerLength('q1_current_feeling', 'これは十分な長さの回答です。')
      
      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject answer that is too short', () => {
      const result = validateAnswerLength('q1_current_feeling', 'はい')
      
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('10文字以上')
    })

    it('should reject answer that is too long', () => {
      const longAnswer = 'あ'.repeat(501)
      const result = validateAnswerLength('q1_current_feeling', longAnswer)
      
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('500文字以内')
    })

    it('should handle invalid question ID', () => {
      const result = validateAnswerLength('invalid_id', 'テスト回答')
      
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('質問が見つかりません')
    })
  })

  describe('validateRequiredQuestions', () => {
    it('should validate when all required questions are answered', () => {
      const answers = {
        'q1_current_feeling': { answer: 'テスト回答1' },
        'q2_work_stress': { answer: 'テスト回答2' },
        'q3_motivation_energy': { answer: 'テスト回答3' },
        'q4_ideal_work': { answer: 'テスト回答4' },
        'q5_career_concerns': { answer: 'テスト回答5' },
        'q6_skills_growth': { answer: 'テスト回答6' }
      }

      const result = validateRequiredQuestions(answers)
      
      expect(result.isValid).toBe(true)
      expect(result.missingRequired).toHaveLength(0)
    })

    it('should detect missing required questions', () => {
      const answers = {
        'q1_current_feeling': { answer: 'テスト回答1' }
        // 他の必須質問が未回答
      }

      const result = validateRequiredQuestions(answers)
      
      expect(result.isValid).toBe(false)
      expect(result.missingRequired.length).toBeGreaterThan(0)
      expect(result.missingRequired).toContain('q2_work_stress')
    })

    it('should handle empty answers', () => {
      const answers = {
        'q1_current_feeling': { answer: '' },
        'q2_work_stress': { answer: '   ' } // 空白のみ
      }

      const result = validateRequiredQuestions(answers)
      
      expect(result.isValid).toBe(false)
      expect(result.missingRequired).toContain('q1_current_feeling')
      expect(result.missingRequired).toContain('q2_work_stress')
    })
  })

  describe('getProgressInfo', () => {
    it('should calculate correct progress information', () => {
      const info = getProgressInfo(6)
      
      expect(info.answeredQuestions).toBe(6)
      expect(info.totalQuestions).toBe(10)
      expect(info.progressPercentage).toBe(60)
      expect(info.canDiagnose).toBe(true)
      expect(info.isCompleted).toBe(false)
      expect(info.currentConfig.confidenceLevel).toBe('medium')
    })

    it('should handle completion state', () => {
      const info = getProgressInfo(10)
      
      expect(info.isCompleted).toBe(true)
      expect(info.progressPercentage).toBe(100)
      expect(info.currentConfig.confidenceLevel).toBe('high')
    })

    it('should handle start state', () => {
      const info = getProgressInfo(0)
      
      expect(info.canDiagnose).toBe(false)
      expect(info.progressPercentage).toBe(0)
      expect(info.currentConfig.confidenceLevel).toBe('low')
    })
  })

  describe('getNextQuestion', () => {
    it('should return correct next question', () => {
      const nextQuestion = getNextQuestion(0) // 最初の質問
      
      expect(nextQuestion).toBeDefined()
      expect(nextQuestion?.id).toBe('q1_current_feeling')
      expect(nextQuestion?.order).toBe(1)
    })

    it('should return correct middle question', () => {
      const nextQuestion = getNextQuestion(4) // 5番目の質問
      
      expect(nextQuestion).toBeDefined()
      expect(nextQuestion?.id).toBe('q5_career_concerns')
      expect(nextQuestion?.order).toBe(5)
    })

    it('should return null when no more questions', () => {
      const nextQuestion = getNextQuestion(10) // すべて回答済み
      
      expect(nextQuestion).toBeNull()
    })

    it('should handle negative input', () => {
      const nextQuestion = getNextQuestion(-1)
      
      expect(nextQuestion).toBeNull() // -1 + 1 = 0だが、order=0の質問は存在しないためnull
    })
  })

  describe('QUESTION_CATEGORIES', () => {
    it('should have all required categories', () => {
      expect(QUESTION_CATEGORIES.basic).toBeDefined()
      expect(QUESTION_CATEGORIES.detailed).toBeDefined()
      expect(QUESTION_CATEGORIES.deep).toBeDefined()
    })

    it('should have proper category structure', () => {
      Object.values(QUESTION_CATEGORIES).forEach(category => {
        expect(category.name).toBeDefined()
        expect(category.description).toBeDefined()
        expect(category.color).toBeDefined()
        expect(category.icon).toBeDefined()
      })
    })
  })

  describe('Question Content Quality', () => {
    it('should have professional and clear question text', () => {
      V3_QUESTIONS.forEach(question => {
        expect(question.question.length).toBeGreaterThan(15)
        expect(question.question).toMatch(/[？。]$/) // 質問文は疑問符か句点で終わる
        expect(question.question).not.toContain('TODO')
        expect(question.question).not.toContain('xxx')
      })
    })

    it('should have appropriate placeholder examples', () => {
      V3_QUESTIONS.forEach(question => {
        expect(question.placeholder).toMatch(/^例：/)
        expect(question.placeholder.length).toBeGreaterThan(20)
        expect(question.placeholder).not.toContain('TODO')
      })
    })

    it('should have balanced analysis weights across categories', () => {
      const basicQuestions = V3_QUESTIONS.filter(q => q.category === 'basic')
      const detailedQuestions = V3_QUESTIONS.filter(q => q.category === 'detailed')
      const deepQuestions = V3_QUESTIONS.filter(q => q.category === 'deep')

      const basicTotal = basicQuestions.reduce((sum, q) => sum + q.analysisWeight, 0)
      const detailedTotal = detailedQuestions.reduce((sum, q) => sum + q.analysisWeight, 0)
      const deepTotal = deepQuestions.reduce((sum, q) => sum + q.analysisWeight, 0)

      // 各カテゴリの重み付けが適切にバランスされていることを確認
      expect(basicTotal).toBeGreaterThan(20) // 基本情報は重要
      expect(detailedTotal).toBeGreaterThan(15) // 詳細分析も重要
      expect(deepTotal).toBeGreaterThan(15) // 深層分析も重要
    })

    it('should have appropriate min/max length settings', () => {
      V3_QUESTIONS.forEach(question => {
        expect(question.minLength).toBeGreaterThanOrEqual(5)
        expect(question.maxLength).toBeGreaterThanOrEqual(question.minLength)
        expect(question.maxLength).toBeLessThanOrEqual(700)
      })
    })
  })
})