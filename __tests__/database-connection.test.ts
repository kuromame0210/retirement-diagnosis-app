/**
 * データベース接続とテーブル構造テスト
 * V3診断システムのデータベース接続確認とスキーマ検証
 */

import { createClient } from '@supabase/supabase-js'

// テスト用のSupabaseクライアント
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { 
    auth: { persistSession: false },
    db: { 
      schema: 'public',
    }
  }
)

describe('Database Connection Tests', () => {
  
  test('Supabase接続テスト', async () => {
    try {
      // 基本的な接続テスト
      const { data, error } = await supabaseAdmin
        .from('career_user_diagnosis_v3')
        .select('count(*)', { count: 'exact', head: true })
      
      expect(error).toBeNull()
      console.log('✅ Supabase接続成功')
      
    } catch (error) {
      console.error('❌ Supabase接続エラー:', error)
      throw error
    }
  })

  test('career_user_diagnosis_v3テーブル存在確認', async () => {
    try {
      // テーブルの存在確認
      const { data, error } = await supabaseAdmin
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_name', 'career_user_diagnosis_v3')
        .eq('table_schema', 'public')
      
      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data?.length).toBeGreaterThan(0)
      
      console.log('✅ career_user_diagnosis_v3テーブル存在確認完了')
      
    } catch (error) {
      console.error('❌ テーブル存在確認エラー:', error)
      throw error
    }
  })

  test('テーブルカラム構造確認', async () => {
    try {
      // カラム一覧取得
      const { data, error } = await supabaseAdmin
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', 'career_user_diagnosis_v3')
        .eq('table_schema', 'public')
        .order('ordinal_position')
      
      expect(error).toBeNull()
      expect(data).toBeDefined()
      
      console.log('📋 テーブルカラム構造:')
      data?.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`)
      })
      
      // 必須カラムの存在確認
      const columnNames = data?.map(col => col.column_name) || []
      const requiredColumns = [
        'id',
        'user_id', 
        'session_id',
        'version_type', // または 'version'
        'current_step',
        'total_questions',
        'completed_questions',
        'is_completed',
        'text_answers',
        'partial_results',
        'clicked_services',
        'started_at',
        'last_activity_at',
        'created_at',
        'updated_at'
      ]
      
      const missingColumns = requiredColumns.filter(col => !columnNames.includes(col))
      
      if (missingColumns.length > 0) {
        console.warn('⚠️  欠落カラム:', missingColumns)
        
        // version_typeがない場合はversionの存在確認
        if (missingColumns.includes('version_type') && columnNames.includes('version')) {
          console.log('ℹ️  version_typeの代わりにversionカラムが存在します')
        }
      } else {
        console.log('✅ 全必須カラムが存在します')
      }
      
      // カラム情報を返す
      return {
        columns: data,
        missingColumns,
        hasVersionType: columnNames.includes('version_type'),
        hasVersion: columnNames.includes('version')
      }
      
    } catch (error) {
      console.error('❌ カラム構造確認エラー:', error)
      throw error
    }
  })

  test('データベース書き込みテスト', async () => {
    try {
      const testData = {
        user_id: 'test-user-' + Date.now(),
        session_id: 'test-session-' + Date.now(),
        version_type: 'v3', // もしくは version: 'v3'
        current_step: 1,
        total_questions: 10,
        completed_questions: 0,
        is_completed: false,
        text_answers: {},
        partial_results: [],
        clicked_services: [],
        started_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      console.log('🧪 テストデータ挿入開始...')
      
      // データ挿入テスト
      const { data, error } = await supabaseAdmin
        .from('career_user_diagnosis_v3')
        .insert(testData)
        .select('id')
        .single()
      
      if (error) {
        console.error('❌ 挿入エラー詳細:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
        
        // version_typeエラーの場合はversionで再試行
        if (error.message.includes('version_type')) {
          console.log('🔄 version_typeエラーのため、versionカラムで再試行...')
          
          const testDataWithVersion = {
            ...testData,
            version: testData.version_type
          }
          delete (testDataWithVersion as any).version_type
          
          const { data: retryData, error: retryError } = await supabaseAdmin
            .from('career_user_diagnosis_v3')
            .insert(testDataWithVersion)
            .select('id')
            .single()
          
          if (retryError) {
            throw retryError
          }
          
          console.log('✅ versionカラムでの挿入成功:', retryData?.id)
          
          // テストデータ削除
          await supabaseAdmin
            .from('career_user_diagnosis_v3')
            .delete()
            .eq('id', retryData?.id)
          
          return { success: true, usesVersionColumn: true }
        }
        
        throw error
      }
      
      console.log('✅ version_typeカラムでの挿入成功:', data?.id)
      
      // テストデータ削除
      await supabaseAdmin
        .from('career_user_diagnosis_v3')
        .delete()
        .eq('id', data?.id)
      
      return { success: true, usesVersionColumn: false }
      
    } catch (error) {
      console.error('❌ データベース書き込みテストエラー:', error)
      throw error
    }
  })

})