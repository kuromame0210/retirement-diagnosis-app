/**
 * 簡単なデータベーステスト
 * career_user_diagnosis_v3テーブルへの基本的なアクセステスト
 */

describe('Simple Database Test', () => {
  
  test('テーブル構造をログ出力', async () => {
    // 直接fetch APIを使用してテーブル構造を確認
    console.log('🔍 テーブル構造確認テスト開始')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !serviceKey) {
      console.error('❌ 環境変数が設定されていません')
      console.log('SUPABASE_URL:', supabaseUrl ? '設定済み' : '未設定')
      console.log('SERVICE_KEY:', serviceKey ? '設定済み' : '未設定')
      return
    }
    
    try {
      // PostgREST APIを直接呼び出し
      const response = await fetch(
        `${supabaseUrl}/rest/v1/information_schema.columns?table_name=eq.career_user_diagnosis_v3&table_schema=eq.public&select=column_name,data_type,is_nullable`,
        {
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json'
          }
        }
      )
      
      if (!response.ok) {
        console.error('❌ API呼び出しエラー:', response.status, response.statusText)
        const errorText = await response.text()
        console.error('エラー詳細:', errorText)
        return
      }
      
      const columns = await response.json()
      
      console.log('📋 career_user_diagnosis_v3テーブルのカラム構造:')
      columns.forEach((col: any) => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`)
      })
      
      // 必須カラムチェック
      const columnNames = columns.map((col: any) => col.column_name)
      const expectedColumns = [
        'id', 'user_id', 'session_id', 'version_type', 'current_step',
        'total_questions', 'completed_questions', 'is_completed',
        'text_answers', 'partial_results', 'clicked_services',
        'started_at', 'last_activity_at', 'created_at', 'updated_at'
      ]
      
      const missingColumns = expectedColumns.filter(col => !columnNames.includes(col))
      const extraColumns = columnNames.filter((col: string) => !expectedColumns.includes(col))
      
      if (missingColumns.length > 0) {
        console.warn('⚠️  不足しているカラム:', missingColumns)
      }
      
      if (extraColumns.length > 0) {
        console.log('ℹ️  追加のカラム:', extraColumns)
      }
      
      // version vs version_type チェック
      if (columnNames.includes('version') && !columnNames.includes('version_type')) {
        console.log('🔄 versionカラムが存在、version_typeは未存在')
      } else if (columnNames.includes('version_type')) {
        console.log('✅ version_typeカラムが存在')
      }
      
      expect(columns.length).toBeGreaterThan(0)
      
    } catch (error) {
      console.error('❌ テスト実行エラー:', error)
      throw error
    }
  })

})