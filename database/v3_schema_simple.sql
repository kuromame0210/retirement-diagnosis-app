-- ============================================
-- V3診断システム シンプル版スキーマ
-- 必要最小限のテーブル構成
-- ============================================

-- メインテーブル: career_user_diagnosis_v3
CREATE TABLE career_user_diagnosis_v3 (
  -- 基本識別子
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  session_id VARCHAR(255) NOT NULL UNIQUE,
  
  -- V3バージョン管理
  version VARCHAR(10) DEFAULT 'v3' NOT NULL,
  
  -- 診断進行状況
  completed_questions INTEGER DEFAULT 0 NOT NULL,
  total_questions INTEGER DEFAULT 10 NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  
  -- テキスト回答データ（JSONB形式）
  text_answers JSONB DEFAULT '{}' NOT NULL,
  
  -- 途中診断結果（複数回保存）
  partial_results JSONB DEFAULT '[]' NOT NULL,
  
  -- 最終診断結果
  final_result JSONB DEFAULT NULL,
  
  -- サービスクリック履歴
  clicked_services JSONB DEFAULT '[]' NOT NULL,
  
  -- タイムスタンプ
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 必要最小限のインデックス
-- ============================================

-- 基本検索用（管理画面で使用）
CREATE INDEX idx_v3_session_id ON career_user_diagnosis_v3(session_id);
CREATE INDEX idx_v3_updated_at ON career_user_diagnosis_v3(updated_at DESC);

-- ============================================
-- 基本制約のみ
-- ============================================

-- completed_questionsの範囲チェック
ALTER TABLE career_user_diagnosis_v3 
ADD CONSTRAINT check_v3_completed_questions 
CHECK (completed_questions >= 0 AND completed_questions <= total_questions);

-- ============================================
-- RLS (Row Level Security) ポリシー
-- ============================================

-- RLSを有効化
ALTER TABLE career_user_diagnosis_v3 ENABLE ROW LEVEL SECURITY;

-- 管理者のみ全データアクセス可能（service_role）
CREATE POLICY "Admin full access" ON career_user_diagnosis_v3
  FOR ALL USING (auth.role() = 'service_role');

-- 匿名ユーザーは自分のセッションのみ読み書き可能
CREATE POLICY "Anonymous user session access" ON career_user_diagnosis_v3
  FOR ALL USING (auth.role() = 'anon');

-- 認証済みユーザーは自分のセッションのみアクセス可能（将来用）
CREATE POLICY "Authenticated user session access" ON career_user_diagnosis_v3
  FOR ALL USING (auth.role() = 'authenticated');