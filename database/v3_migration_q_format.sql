-- ============================================
-- V3診断システム テキスト回答キー名変更
-- q1_current_feeling → q1_text 形式に統一
-- 実行日: 2025-06-24
-- ============================================

-- 既存データのtext_answersを新形式に変換
-- JSON内のキー名を変更する関数を実行

BEGIN;

-- 1. バックアップ用の一時テーブルを作成（安全のため）
CREATE TABLE career_user_diagnosis_v3_backup AS 
SELECT * FROM career_user_diagnosis_v3;

-- 2. text_answersのキー名を新形式に変換
UPDATE career_user_diagnosis_v3 
SET text_answers = (
  SELECT jsonb_object_agg(
    CASE 
      -- 既存のキー名を新形式に変換
      WHEN key = 'q1_current_feeling' THEN 'q1_text'
      WHEN key = 'q2_ideal_work' THEN 'q2_text'
      WHEN key = 'q3_career_concerns' THEN 'q3_text'
      WHEN key = 'q4_skills_growth' THEN 'q4_text'
      WHEN key = 'q5_work_life_balance' THEN 'q5_text'
      WHEN key = 'q6_company_culture' THEN 'q6_text'
      WHEN key = 'q7_compensation' THEN 'q7_text'
      WHEN key = 'q8_future_vision' THEN 'q8_text'
      WHEN key = 'q9_stress_factors' THEN 'q9_text'
      WHEN key = 'q10_action_readiness' THEN 'q10_text'
      -- 既に新形式の場合はそのまま
      WHEN key ~ '^q[0-9]+_text$' THEN key
      -- その他は変換しない（予期しないキーの場合）
      ELSE key
    END,
    value
  )
  FROM jsonb_each(text_answers)
)
WHERE text_answers != '{}';

-- 3. partial_resultsのキー名も同様に変換（診断結果内で参照している場合）
-- これは複雑なので、必要に応じて個別対応

-- 4. 変更結果の確認用クエリ（コメントアウトを外して実行）
/*
-- 変更前後の比較
SELECT 
  session_id,
  'BEFORE' as status,
  jsonb_object_keys(b.text_answers) as old_keys
FROM career_user_diagnosis_v3_backup b
WHERE b.text_answers != '{}'
UNION ALL
SELECT 
  session_id,
  'AFTER' as status,
  jsonb_object_keys(c.text_answers) as new_keys  
FROM career_user_diagnosis_v3 c
WHERE c.text_answers != '{}'
ORDER BY session_id, status;
*/

-- 5. サンプルデータの確認
SELECT 
  session_id,
  jsonb_object_keys(text_answers) as answer_keys,
  jsonb_array_length(partial_results) as partial_count
FROM career_user_diagnosis_v3 
WHERE text_answers != '{}'
LIMIT 5;

COMMIT;

-- ============================================
-- 実行後の確認事項
-- ============================================

/*
1. 変更が正しく適用されたか確認:
   SELECT jsonb_object_keys(text_answers) FROM career_user_diagnosis_v3 WHERE text_answers != '{}';

2. データ数が変わっていないか確認:
   SELECT COUNT(*) FROM career_user_diagnosis_v3;
   SELECT COUNT(*) FROM career_user_diagnosis_v3_backup;

3. 問題なければバックアップテーブルを削除:
   DROP TABLE career_user_diagnosis_v3_backup;

4. 問題があれば元に戻す:
   DROP TABLE career_user_diagnosis_v3;
   ALTER TABLE career_user_diagnosis_v3_backup RENAME TO career_user_diagnosis_v3;
*/

-- ============================================
-- 今後の新規データ用コメント
-- ============================================

/*
このマイグレーション後、アプリケーション側では以下の形式でデータを保存:

text_answers = {
  "q1_text": {
    "question": "今の仕事について、率直にどう感じていますか？",
    "answer": "ユーザーの回答テキスト",
    "answered_at": "2025-06-24T10:00:00.000Z",
    "character_count": 50
  },
  "q2_text": {
    "question": "あなたにとって理想的な働き方や仕事環境は...",
    "answer": "ユーザーの回答テキスト",
    "answered_at": "2025-06-24T10:01:00.000Z", 
    "character_count": 75
  },
  ...
}

利点:
- 質問内容が変わってもキー名は変わらない
- 質問番号が一目で分かる
- シンプルで覚えやすい
- SQLクエリで番号順にソートしやすい
*/