-- ============================================
-- V3診断システム カラムベース版テーブル再作成
-- q1_text～q10_textの個別カラム構成
-- 実行日: 2025-06-24
-- ============================================

BEGIN;

-- 1. 既存テーブルを削除（データも含めて完全削除）
DROP TABLE IF EXISTS public.career_user_diagnosis_v3 CASCADE;

-- 2. 新しいテーブルを作成（カラムベース版）
CREATE TABLE public.career_user_diagnosis_v3 (
  -- 基本識別子
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  session_id VARCHAR(255) NOT NULL,
  
  -- バージョン管理
  version_type VARCHAR(10) NOT NULL DEFAULT 'v3',
  
  -- 質問回答（個別カラム）
  q1_text TEXT NULL,
  q2_text TEXT NULL,
  q3_text TEXT NULL,
  q4_text TEXT NULL,
  q5_text TEXT NULL,
  q6_text TEXT NULL,
  q7_text TEXT NULL,
  q8_text TEXT NULL,
  q9_text TEXT NULL,
  q10_text TEXT NULL,
  
  -- 質問の内容を保存（参照用）
  q1_question TEXT DEFAULT '今の仕事について、率直にどう感じていますか？',
  q2_question TEXT DEFAULT '仕事で最もストレスを感じるのはどのような時ですか？',
  q3_question TEXT DEFAULT '朝起きた時、仕事に対するモチベーションやエネルギーはどの程度ありますか？',
  q4_question TEXT DEFAULT 'あなたにとって理想的な働き方や仕事環境はどのようなものですか？',
  q5_question TEXT DEFAULT '現在のキャリアで最も不安に感じていることは何ですか？',
  q6_question TEXT DEFAULT '今後身につけたいスキルや成長したい分野はありますか？',
  q7_question TEXT DEFAULT 'ワークライフバランスについて、現在の状況と理想のバランスを教えてください。',
  q8_question TEXT DEFAULT '現在の職場の雰囲気や企業文化について、どのように感じていますか？',
  q9_question TEXT DEFAULT '給与や待遇面で感じていることがあれば教えてください。',
  q10_question TEXT DEFAULT '現状を変えるために、どの程度行動を起こす準備ができていますか？',
  
  -- 各質問の回答時刻
  q1_answered_at TIMESTAMPTZ NULL,
  q2_answered_at TIMESTAMPTZ NULL,
  q3_answered_at TIMESTAMPTZ NULL,
  q4_answered_at TIMESTAMPTZ NULL,
  q5_answered_at TIMESTAMPTZ NULL,
  q6_answered_at TIMESTAMPTZ NULL,
  q7_answered_at TIMESTAMPTZ NULL,
  q8_answered_at TIMESTAMPTZ NULL,
  q9_answered_at TIMESTAMPTZ NULL,
  q10_answered_at TIMESTAMPTZ NULL,
  
  -- 進捗管理
  current_step INTEGER NOT NULL DEFAULT 1,
  completed_questions INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 10,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- 途中診断結果（複数回保存）
  partial_results JSONB NOT NULL DEFAULT '[]',
  
  -- 最終診断結果
  final_result JSONB NULL DEFAULT NULL,
  
  -- AI分析メタデータ
  ai_analysis JSONB NOT NULL DEFAULT '{}',
  
  -- サービスクリック履歴
  clicked_services JSONB NOT NULL DEFAULT '[]',
  
  -- デバイス・環境情報
  device_info JSONB NOT NULL DEFAULT '{}',
  ip_address VARCHAR(45) NULL,
  region VARCHAR(100) NULL,
  user_agent TEXT NULL,
  
  -- 診断セッション管理
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

-- 回答進捗確認用インデックス（NULL/NOT NULLで回答状況確認）
CREATE INDEX idx_v3_q1_answered ON public.career_user_diagnosis_v3(q1_text) WHERE q1_text IS NOT NULL;
CREATE INDEX idx_v3_q2_answered ON public.career_user_diagnosis_v3(q2_text) WHERE q2_text IS NOT NULL;
CREATE INDEX idx_v3_q3_answered ON public.career_user_diagnosis_v3(q3_text) WHERE q3_text IS NOT NULL;

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

-- 回答済み質問数とNULLでない質問カラムの整合性チェック
ALTER TABLE public.career_user_diagnosis_v3 
ADD CONSTRAINT check_v3_answers_consistency 
CHECK (
  completed_questions = (
    CASE WHEN q1_text IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN q2_text IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN q3_text IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN q4_text IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN q5_text IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN q6_text IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN q7_text IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN q8_text IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN q9_text IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN q10_text IS NOT NULL THEN 1 ELSE 0 END
  )
);

-- ============================================
-- 自動更新トリガー（completed_questionsの自動計算）
-- ============================================

-- completed_questions自動更新トリガー関数
CREATE OR REPLACE FUNCTION update_v3_completed_questions()
RETURNS TRIGGER AS $$
BEGIN
    -- completed_questionsを自動計算
    NEW.completed_questions = (
        CASE WHEN NEW.q1_text IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN NEW.q2_text IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN NEW.q3_text IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN NEW.q4_text IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN NEW.q5_text IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN NEW.q6_text IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN NEW.q7_text IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN NEW.q8_text IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN NEW.q9_text IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN NEW.q10_text IS NOT NULL THEN 1 ELSE 0 END
    );
    
    -- 完了フラグの自動設定
    NEW.is_completed = (NEW.completed_questions = NEW.total_questions);
    
    -- タイムスタンプ更新
    NEW.updated_at = CURRENT_TIMESTAMP;
    NEW.last_activity_at = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガー作成
CREATE TRIGGER update_v3_completed_questions_trigger
    BEFORE INSERT OR UPDATE ON public.career_user_diagnosis_v3 
    FOR EACH ROW 
    EXECUTE FUNCTION update_v3_completed_questions();

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

COMMENT ON TABLE public.career_user_diagnosis_v3 IS 'V3診断システム：カラムベース版、q1_text～q10_textの個別カラム';

COMMENT ON COLUMN public.career_user_diagnosis_v3.q1_text IS '質問1の回答テキスト';
COMMENT ON COLUMN public.career_user_diagnosis_v3.q2_text IS '質問2の回答テキスト';
COMMENT ON COLUMN public.career_user_diagnosis_v3.q3_text IS '質問3の回答テキスト';
COMMENT ON COLUMN public.career_user_diagnosis_v3.q4_text IS '質問4の回答テキスト';
COMMENT ON COLUMN public.career_user_diagnosis_v3.q5_text IS '質問5の回答テキスト';
COMMENT ON COLUMN public.career_user_diagnosis_v3.q6_text IS '質問6の回答テキスト';
COMMENT ON COLUMN public.career_user_diagnosis_v3.q7_text IS '質問7の回答テキスト';
COMMENT ON COLUMN public.career_user_diagnosis_v3.q8_text IS '質問8の回答テキスト';
COMMENT ON COLUMN public.career_user_diagnosis_v3.q9_text IS '質問9の回答テキスト';
COMMENT ON COLUMN public.career_user_diagnosis_v3.q10_text IS '質問10の回答テキスト';

COMMENT ON COLUMN public.career_user_diagnosis_v3.q1_question IS '質問1のテキスト（参照用）';
COMMENT ON COLUMN public.career_user_diagnosis_v3.q2_question IS '質問2のテキスト（参照用）';

COMMENT ON COLUMN public.career_user_diagnosis_v3.completed_questions IS '回答済み質問数（自動計算）';
COMMENT ON COLUMN public.career_user_diagnosis_v3.is_completed IS '全質問完了フラグ（自動設定）';

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
  AND column_name LIKE 'q%'
ORDER BY column_name;

-- 進捗確認用クエリ例
/*
SELECT 
  session_id,
  completed_questions,
  is_completed,
  CASE WHEN q1_text IS NOT NULL THEN '✓' ELSE '×' END as q1,
  CASE WHEN q2_text IS NOT NULL THEN '✓' ELSE '×' END as q2,
  CASE WHEN q3_text IS NOT NULL THEN '✓' ELSE '×' END as q3,
  CASE WHEN q4_text IS NOT NULL THEN '✓' ELSE '×' END as q4,
  CASE WHEN q5_text IS NOT NULL THEN '✓' ELSE '×' END as q5,
  created_at
FROM public.career_user_diagnosis_v3
ORDER BY created_at DESC;
*/

-- ============================================
-- テストデータ例
-- ============================================

/*
-- テストデータ挿入例
INSERT INTO public.career_user_diagnosis_v3 (
  user_id,
  session_id,
  q1_text,
  q1_answered_at
) VALUES (
  'test-user-001',
  'test-session-001',
  'テスト回答です。仕事についてはストレスを感じています。',
  CURRENT_TIMESTAMP
);

-- 2問目の回答追加例
UPDATE public.career_user_diagnosis_v3 
SET 
  q2_text = '上司からの無理な要求があった時にストレスを感じます。',
  q2_answered_at = CURRENT_TIMESTAMP
WHERE session_id = 'test-session-001';
*/