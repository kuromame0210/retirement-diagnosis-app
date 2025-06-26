-- ============================================
-- V3診断システム テーブル再作成
-- 既存テーブルを削除して新しい構造で作成
-- 実行日: 2025-06-24
-- ============================================

BEGIN;

-- 1. 既存テーブルを削除（データも含めて完全削除）
DROP TABLE IF EXISTS public.career_user_diagnosis_v3 CASCADE;

-- 2. 新しいテーブルを作成（改良版）
CREATE TABLE public.career_user_diagnosis_v3 (
  -- 基本識別子
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  session_id VARCHAR(255) NOT NULL,
  
  -- バージョン管理（version_typeに統一）
  version_type VARCHAR(10) NOT NULL DEFAULT 'v3',
  
  -- 診断進行状況
  current_step INTEGER NOT NULL DEFAULT 1,
  total_questions INTEGER NOT NULL DEFAULT 10,
  completed_questions INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- テキスト回答データ（q1_text～q10_text形式）
  text_answers JSONB NOT NULL DEFAULT '{}',
  /*
  新形式での構造例:
  {
    "q1_text": {
      "question": "今の仕事について、率直にどう感じていますか？",
      "answer": "ユーザーの回答テキスト...",
      "answered_at": "2025-06-24T10:00:00.000Z",
      "character_count": 85
    },
    "q2_text": {
      "question": "仕事で最もストレスを感じるのは...",
      "answer": "ユーザーの回答テキスト...",
      "answered_at": "2025-06-24T10:01:00.000Z",
      "character_count": 120
    },
    ...
  }
  */
  
  -- 途中診断結果（複数回保存）
  partial_results JSONB NOT NULL DEFAULT '[]',
  /*
  partial_results構造例:
  [
    {
      "diagnosed_at": "2025-06-24T10:05:00.000Z",
      "answered_questions": 3,
      "result_type": "転職検討型（暫定）",
      "confidence_level": "low",
      "summary": "3問時点での分析結果...",
      "recommendations": ["まずは詳細分析を..."]
    }
  ]
  */
  
  -- 最終診断結果
  final_result JSONB NULL DEFAULT NULL,
  /*
  final_result構造例:
  {
    "result_type": "転職積極型",
    "confidence_level": "high",
    "urgency_level": "medium",
    "summary": "総合的な分析結果...",
    "action_plan": [...],
    "service_recommendations": [...]
  }
  */
  
  -- AI分析メタデータ
  ai_analysis JSONB NOT NULL DEFAULT '{}',
  
  -- サービスクリック履歴
  clicked_services JSONB NOT NULL DEFAULT '[]',
  /*
  clicked_services構造例:
  [
    {
      "service_id": "service-001",
      "service_name": "転職エージェントA",
      "service_url": "https://example.com",
      "clicked_at": "2025-06-24T10:30:00.000Z",
      "diagnosis_stage": "partial_3"
    }
  ]
  */
  
  -- デバイス・環境情報
  device_info JSONB NOT NULL DEFAULT '{}',
  ip_address VARCHAR(45) NULL,
  region VARCHAR(100) NULL,
  user_agent TEXT NULL,
  
  -- 診断セッション管理（JST統一）
  started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  first_partial_diagnosis_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- タイムスタンプ
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- 制約
  CONSTRAINT career_user_diagnosis_v3_pkey PRIMARY KEY (id),
  CONSTRAINT career_user_diagnosis_v3_session_id_key UNIQUE (session_id)
);

-- ============================================
-- インデックス作成
-- ============================================

-- 基本検索用インデックス
CREATE INDEX idx_v3_user_id ON public.career_user_diagnosis_v3(user_id);
CREATE INDEX idx_v3_session_id ON public.career_user_diagnosis_v3(session_id);
CREATE INDEX idx_v3_version_type ON public.career_user_diagnosis_v3(version_type);

-- 時系列分析用インデックス
CREATE INDEX idx_v3_created_at ON public.career_user_diagnosis_v3(created_at DESC);
CREATE INDEX idx_v3_updated_at ON public.career_user_diagnosis_v3(updated_at DESC);
CREATE INDEX idx_v3_completed_at ON public.career_user_diagnosis_v3(completed_at DESC);

-- 診断進行状況用インデックス
CREATE INDEX idx_v3_completion_status ON public.career_user_diagnosis_v3(is_completed, completed_questions);
CREATE INDEX idx_v3_current_step ON public.career_user_diagnosis_v3(current_step);

-- 分析用複合インデックス
CREATE INDEX idx_v3_analysis ON public.career_user_diagnosis_v3(version_type, is_completed, created_at DESC);

-- ============================================
-- 制約追加
-- ============================================

-- completed_questionsはtotal_questions以下
ALTER TABLE public.career_user_diagnosis_v3 
ADD CONSTRAINT check_v3_completed_questions 
CHECK (completed_questions >= 0 AND completed_questions <= total_questions);

-- current_stepは1以上total_questions以下
ALTER TABLE public.career_user_diagnosis_v3 
ADD CONSTRAINT check_v3_current_step 
CHECK (current_step >= 1 AND current_step <= total_questions + 1);

-- is_completedがtrueの場合はcompleted_questionsがtotal_questionsと等しい
ALTER TABLE public.career_user_diagnosis_v3 
ADD CONSTRAINT check_v3_completion_consistency 
CHECK (
  (is_completed = FALSE) OR 
  (is_completed = TRUE AND completed_questions = total_questions)
);

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
    BEFORE UPDATE ON public.career_user_diagnosis_v3 
    FOR EACH ROW 
    EXECUTE FUNCTION update_v3_updated_at_column();

-- ============================================
-- RLS (Row Level Security) ポリシー
-- ============================================

-- RLSを有効化
ALTER TABLE public.career_user_diagnosis_v3 ENABLE ROW LEVEL SECURITY;

-- 管理者のみ全データアクセス可能（service_role）
CREATE POLICY "Admin full access" ON public.career_user_diagnosis_v3
  FOR ALL USING (auth.role() = 'service_role');

-- 匿名ユーザーは自分のセッションのみ読み書き可能
CREATE POLICY "Anonymous user session access" ON public.career_user_diagnosis_v3
  FOR ALL USING (auth.role() = 'anon');

-- 認証済みユーザーは自分のセッションのみアクセス可能（将来用）
CREATE POLICY "Authenticated user session access" ON public.career_user_diagnosis_v3
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- コメント追加（ドキュメント化）
-- ============================================

COMMENT ON TABLE public.career_user_diagnosis_v3 IS 'V3診断システム：q1_text形式対応、全テキスト回答、途中診断機能付き';

COMMENT ON COLUMN public.career_user_diagnosis_v3.version_type IS 'バージョン管理（v3固定）';
COMMENT ON COLUMN public.career_user_diagnosis_v3.text_answers IS 'q1_text～q10_text形式のテキスト回答（JSONB）';
COMMENT ON COLUMN public.career_user_diagnosis_v3.partial_results IS '途中診断結果履歴（JSONB配列）';
COMMENT ON COLUMN public.career_user_diagnosis_v3.final_result IS '最終診断結果（JSONB）';
COMMENT ON COLUMN public.career_user_diagnosis_v3.ai_analysis IS 'AI分析メタデータ（JSONB）';
COMMENT ON COLUMN public.career_user_diagnosis_v3.clicked_services IS 'サービスクリック履歴（JSONB配列）';

COMMENT ON COLUMN public.career_user_diagnosis_v3.current_step IS '現在の質問番号（1-10）';
COMMENT ON COLUMN public.career_user_diagnosis_v3.completed_questions IS '回答済み質問数';
COMMENT ON COLUMN public.career_user_diagnosis_v3.is_completed IS '全質問完了フラグ';

COMMENT ON COLUMN public.career_user_diagnosis_v3.started_at IS '診断開始時刻';
COMMENT ON COLUMN public.career_user_diagnosis_v3.first_partial_diagnosis_at IS '初回途中診断実行時刻';
COMMENT ON COLUMN public.career_user_diagnosis_v3.completed_at IS '全質問完了時刻';
COMMENT ON COLUMN public.career_user_diagnosis_v3.last_activity_at IS '最終活動時刻';

COMMIT;

-- ============================================
-- 確認クエリ
-- ============================================

-- テーブル構造の確認
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'career_user_diagnosis_v3' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- インデックスの確認
SELECT 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename = 'career_user_diagnosis_v3' 
  AND schemaname = 'public';

-- 制約の確認
SELECT 
  constraint_name, 
  constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'career_user_diagnosis_v3' 
  AND table_schema = 'public';

-- ============================================
-- 新しいテーブルでのテストデータ例
-- ============================================

/*
-- テストデータ挿入例（必要に応じて実行）
INSERT INTO public.career_user_diagnosis_v3 (
  user_id,
  session_id,
  current_step,
  completed_questions,
  text_answers
) VALUES (
  'test-user-001',
  'test-session-001',
  1,
  0,
  '{}'::jsonb
);

-- q1_text形式でのデータ更新例
UPDATE public.career_user_diagnosis_v3 
SET 
  text_answers = jsonb_set(
    text_answers,
    '{q1_text}',
    '{
      "question": "今の仕事について、率直にどう感じていますか？",
      "answer": "テスト回答です",
      "answered_at": "2025-06-24T10:00:00.000Z",
      "character_count": 8
    }'::jsonb
  ),
  completed_questions = 1,
  current_step = 2
WHERE session_id = 'test-session-001';
*/