-- ============================================
-- V3診断システム データベーススキーマ
-- 作成日: 2025-06-23
-- 特徴: 全テキスト回答 + 途中診断対応
-- ============================================

-- メインテーブル: career_user_diagnosis_v3
CREATE TABLE career_user_diagnosis_v3 (
  -- 基本識別子
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  session_id VARCHAR(255) NOT NULL UNIQUE,
  
  -- V3バージョン管理
  version_type VARCHAR(10) DEFAULT 'v3' NOT NULL,
  
  -- 診断進行状況
  current_step INTEGER DEFAULT 1 NOT NULL,
  total_questions INTEGER DEFAULT 10 NOT NULL,
  completed_questions INTEGER DEFAULT 0 NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  
  -- テキスト回答データ（JSONB形式）
  text_answers JSONB DEFAULT '{}' NOT NULL,
  /*
  text_answers構造例:
  {
    "q1_current_feeling": {
      "question": "今の仕事について、率直にどう感じていますか？",
      "answer": "毎朝会社に行くのが憂鬱で...",
      "answered_at": "2025-06-23T10:00:00.000Z",
      "character_count": 45
    },
    "q2_ideal_work": { ... },
    ...
  }
  */
  
  -- 途中診断結果（複数回保存）
  partial_results JSONB DEFAULT '[]' NOT NULL,
  /*
  partial_results構造例:
  [
    {
      "diagnosed_at": "2025-06-23T10:05:00.000Z",
      "answered_questions": 3,
      "result_type": "転職検討型（暫定）",
      "confidence_level": "low",
      "summary": "3問時点での分析結果...",
      "recommendations": ["まずは詳細分析を..."]
    },
    {
      "diagnosed_at": "2025-06-23T10:15:00.000Z",
      "answered_questions": 7,
      "result_type": "転職検討型",
      "confidence_level": "medium",
      "summary": "7問時点での分析結果...",
      "recommendations": ["具体的な転職準備を..."]
    }
  ]
  */
  
  -- 最終診断結果
  final_result JSONB DEFAULT '{}',
  /*
  final_result構造例:
  {
    "result_type": "転職積極型",
    "confidence_level": "high",
    "urgency_level": "medium",
    "summary": "総合的な分析結果...",
    "detailed_analysis": {
      "emotional_state": "ストレス高",
      "career_goals": "成長志向",
      "risk_factors": ["スキル不安", "年収不安"]
    },
    "action_plan": [
      "1. スキルアップ計画の策定",
      "2. 転職市場の調査開始"
    ],
    "service_recommendations": [...]
  }
  */
  
  -- AI分析メタデータ
  ai_analysis JSONB DEFAULT '{}',
  /*
  ai_analysis構造例:
  {
    "keyword_analysis": {
      "positive_keywords": ["成長", "挑戦"],
      "negative_keywords": ["ストレス", "不安"],
      "career_keywords": ["エンジニア", "リモート"]
    },
    "sentiment_analysis": {
      "overall_sentiment": "negative",
      "question_sentiments": {
        "q1": "negative",
        "q2": "positive",
        ...
      }
    },
    "text_statistics": {
      "total_characters": 1250,
      "average_per_question": 125,
      "detailed_answers": 7
    }
  }
  */
  
  -- サービスクリック履歴
  clicked_services JSONB DEFAULT '[]',
  /*
  clicked_services構造例:
  [
    {
      "service_id": "service-001",
      "service_name": "転職エージェントA",
      "service_url": "https://example.com",
      "clicked_at": "2025-06-23T10:30:00.000Z",
      "diagnosis_stage": "partial_3", // "partial_N" or "final"
      "result_type_when_clicked": "転職検討型（暫定）"
    }
  ]
  */
  
  -- デバイス・環境情報
  device_info JSONB DEFAULT '{}',
  ip_address VARCHAR(45),
  region VARCHAR(100),
  user_agent TEXT,
  
  -- 診断セッション管理
  started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  first_partial_diagnosis_at TIMESTAMPTZ, -- 初回途中診断実行時刻
  completed_at TIMESTAMPTZ, -- 全質問完了時刻
  last_activity_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  -- タイムスタンプ（JST統一）
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- インデックス作成
-- ============================================

-- 基本検索用インデックス
CREATE INDEX idx_v3_user_id ON career_user_diagnosis_v3(user_id);
CREATE INDEX idx_v3_session_id ON career_user_diagnosis_v3(session_id);
CREATE INDEX idx_v3_version_type ON career_user_diagnosis_v3(version_type);

-- 時系列分析用インデックス
CREATE INDEX idx_v3_created_at ON career_user_diagnosis_v3(created_at DESC);
CREATE INDEX idx_v3_updated_at ON career_user_diagnosis_v3(updated_at DESC);
CREATE INDEX idx_v3_completed_at ON career_user_diagnosis_v3(completed_at DESC);

-- 診断進行状況用インデックス
CREATE INDEX idx_v3_completion_status ON career_user_diagnosis_v3(is_completed, completed_questions);
CREATE INDEX idx_v3_current_step ON career_user_diagnosis_v3(current_step);

-- 分析用複合インデックス
CREATE INDEX idx_v3_analysis ON career_user_diagnosis_v3(version_type, is_completed, created_at DESC);

-- ============================================
-- 自動更新トリガー
-- ============================================

-- updated_at自動更新トリガー関数
CREATE OR REPLACE FUNCTION update_v3_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    NEW.last_activity_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガー作成
CREATE TRIGGER update_v3_diagnosis_updated_at 
    BEFORE UPDATE ON career_user_diagnosis_v3 
    FOR EACH ROW 
    EXECUTE FUNCTION update_v3_updated_at_column();

-- ============================================
-- データ整合性制約
-- ============================================

-- completed_questionsはtotal_questions以下
ALTER TABLE career_user_diagnosis_v3 
ADD CONSTRAINT check_v3_completed_questions 
CHECK (completed_questions >= 0 AND completed_questions <= total_questions);

-- current_stepは1以上total_questions以下
ALTER TABLE career_user_diagnosis_v3 
ADD CONSTRAINT check_v3_current_step 
CHECK (current_step >= 1 AND current_step <= total_questions + 1);

-- is_completedがtrueの場合はcompleted_questionsがtotal_questionsと等しい
ALTER TABLE career_user_diagnosis_v3 
ADD CONSTRAINT check_v3_completion_consistency 
CHECK (
  (is_completed = FALSE) OR 
  (is_completed = TRUE AND completed_questions = total_questions)
);

-- ============================================
-- コメント追加（ドキュメント化）
-- ============================================

COMMENT ON TABLE career_user_diagnosis_v3 IS 'V3診断システム：全テキスト回答対応、途中診断機能付き';

COMMENT ON COLUMN career_user_diagnosis_v3.text_answers IS '質問別テキスト回答（JSONB）：質問ID、回答内容、回答時刻、文字数を保存';
COMMENT ON COLUMN career_user_diagnosis_v3.partial_results IS '途中診断結果履歴（JSONB配列）：回答数別の分析結果を複数保存';
COMMENT ON COLUMN career_user_diagnosis_v3.final_result IS '最終診断結果（JSONB）：全質問回答後の確定分析結果';
COMMENT ON COLUMN career_user_diagnosis_v3.ai_analysis IS 'AI分析メタデータ（JSONB）：キーワード分析、感情分析、統計情報';
COMMENT ON COLUMN career_user_diagnosis_v3.clicked_services IS 'サービスクリック履歴（JSONB配列）：診断段階別クリック記録';

COMMENT ON COLUMN career_user_diagnosis_v3.completed_questions IS '回答済み質問数：途中診断の精度判定に使用';
COMMENT ON COLUMN career_user_diagnosis_v3.current_step IS '現在の質問番号：セッション復帰時に使用';
COMMENT ON COLUMN career_user_diagnosis_v3.is_completed IS '全質問完了フラグ：最終診断実行判定';

COMMENT ON COLUMN career_user_diagnosis_v3.first_partial_diagnosis_at IS '初回途中診断実行時刻：ユーザー行動分析用';
COMMENT ON COLUMN career_user_diagnosis_v3.last_activity_at IS '最終活動時刻：セッション管理用';

-- ============================================
-- 初期データ・サンプル（開発用）
-- ============================================

-- V3質問マスターデータ（参考用）
/*
V3_QUESTIONS = [
  { id: 'q1_current_feeling', question: '今の仕事について、率直にどう感じていますか？' },
  { id: 'q2_ideal_work', question: 'あなたにとって理想的な働き方や仕事環境はどのようなものですか？' },
  { id: 'q3_career_concerns', question: '現在のキャリアで最も不安に感じていることは何ですか？' },
  { id: 'q4_skills_growth', question: '今後身につけたいスキルや成長したい分野はありますか？' },
  { id: 'q5_work_life_balance', question: 'ワークライフバランスについてどのように考えていますか？' },
  { id: 'q6_company_culture', question: '現在の職場の雰囲気や企業文化についてどう思いますか？' },
  { id: 'q7_compensation', question: '給与や待遇面で感じていることがあれば教えてください。' },
  { id: 'q8_future_vision', question: '3年後、5年後のキャリアについてどのように考えていますか？' },
  { id: 'q9_stress_factors', question: '仕事で最もストレスを感じるのはどのような時ですか？' },
  { id: 'q10_action_readiness', question: '現状を変えるために、どの程度行動を起こす準備ができていますか？' }
]
*/

-- ============================================
-- 運用クエリ（管理画面用）
-- ============================================

-- V3診断データ一覧取得
/*
SELECT 
  user_id,
  session_id,
  completed_questions,
  total_questions,
  is_completed,
  CASE 
    WHEN final_result->>'result_type' IS NOT NULL THEN final_result->>'result_type'
    WHEN jsonb_array_length(partial_results) > 0 THEN (partial_results->-1->>'result_type')
    ELSE '未診断'
  END as latest_result_type,
  created_at,
  updated_at
FROM career_user_diagnosis_v3
ORDER BY updated_at DESC
LIMIT 100;
*/

-- V3途中診断統計
/*
SELECT 
  completed_questions,
  COUNT(*) as count,
  AVG(CASE WHEN is_completed THEN 1.0 ELSE 0.0 END) as completion_rate
FROM career_user_diagnosis_v3
GROUP BY completed_questions
ORDER BY completed_questions;
*/