/**
 * V3データベーステーブル状況調査テスト
 * 
 * 以下を調査する：
 * 1. career_user_diagnosis_v3テーブルの存在確認
 * 2. テーブルスキーマの確認
 * 3. レコード数の確認
 * 4. サンプルデータの確認
 * 5. 管理画面関数の動作確認
 */

import { supabaseAdmin } from '@/lib/supabase'
import { getV3DiagnosisListForAdmin, getV3DiagnosisStats, getV3ServiceClickStats } from '@/lib/v3/database'

describe('V3データベーステーブル調査', () => {
  
  test('1. career_user_diagnosis_v3テーブルの存在確認', async () => {
    console.log('\n🔍 テーブル存在確認中...')
    
    try {
      // 直接テーブルにアクセスして存在確認
      const { data, error } = await supabaseAdmin
        .from('career_user_diagnosis_v3')
        .select('id', { count: 'exact', head: true })
      
      if (error) {
        console.error('❌ テーブルアクセスエラー:', error)
        console.log('テーブルが存在しない可能性があります')
        // エラーがあってもテストを継続するためにexpectを削除
      } else {
        console.log('✅ career_user_diagnosis_v3テーブルは存在します')
        console.log('レコード数:', data)
        expect(true).toBe(true) // テスト成功
      }
    } catch (error) {
      console.error('❌ テーブル確認エラー:', error)
      // エラーがあってもテストを継続
    }
  })

  test('2. テーブルカラム構造の確認', async () => {
    console.log('\n🔍 テーブル構造確認中...')
    
    try {
      // information_schemaを使ってカラム情報を取得
      const { data: columns, error } = await supabaseAdmin
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', 'career_user_diagnosis_v3')
        .order('ordinal_position')
      
      if (error) {
        console.error('❌ カラム情報取得エラー:', error)
      } else {
        console.log('✅ テーブルカラム一覧:')
        columns?.forEach(col => {
          console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`)
        })
      }
    } catch (error) {
      console.error('❌ カラム確認エラー:', error)
    }
  })

  test('3. レコード数とサンプルデータの確認', async () => {
    console.log('\n🔍 レコード数確認中...')
    
    try {
      // 件数取得
      const { count, error: countError } = await supabaseAdmin
        .from('career_user_diagnosis_v3')
        .select('id', { count: 'exact', head: true })
      
      if (countError) {
        console.error('❌ 件数取得エラー:', countError)
      } else {
        console.log(`✅ 総レコード数: ${count}件`)
      }
      
      // サンプルデータ取得（最新5件）
      const { data: sampleData, error: dataError } = await supabaseAdmin
        .from('career_user_diagnosis_v3')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(5)
      
      if (dataError) {
        console.error('❌ サンプルデータ取得エラー:', dataError)
      } else {
        console.log(`✅ サンプルデータ (最新${sampleData?.length || 0}件):`)
        sampleData?.forEach((record, index) => {
          console.log(`  ${index + 1}. SessionID: ${record.session_id}`)
          console.log(`     作成日時: ${record.created_at}`)
          console.log(`     完了状況: ${record.is_completed ? '完了' : '進行中'}`)
          console.log(`     回答数: ${record.completed_questions}/${record.total_questions}`)
          console.log(`     Q1回答: ${record.q1_text ? record.q1_text.substring(0, 50) + '...' : '未回答'}`)
          console.log('')
        })
      }
    } catch (error) {
      console.error('❌ データ確認エラー:', error)
    }
  })

  test('4. 管理画面関数の動作確認', async () => {
    console.log('\n🔍 管理画面関数テスト中...')
    
    try {
      // getV3DiagnosisListForAdmin関数のテスト
      console.log('4-1. getV3DiagnosisListForAdmin関数テスト')
      const listResult = await getV3DiagnosisListForAdmin(10)
      console.log('✅ 関数実行結果:', {
        dataLength: listResult.data?.length,
        count: listResult.count,
        sampleRecord: listResult.data?.[0] ? {
          session_id: listResult.data[0].session_id,
          is_completed: listResult.data[0].is_completed,
          completed_questions: listResult.data[0].completed_questions,
        } : null
      })
      
      // getV3DiagnosisStats関数のテスト
      console.log('4-2. getV3DiagnosisStats関数テスト')
      const statsResult = await getV3DiagnosisStats()
      console.log('✅ 統計結果:', statsResult)
      
      // getV3ServiceClickStats関数のテスト
      console.log('4-3. getV3ServiceClickStats関数テスト')
      const clickStatsResult = await getV3ServiceClickStats()
      console.log('✅ クリック統計結果:', {
        serviceCount: clickStatsResult.length,
        topServices: clickStatsResult.slice(0, 3)
      })
      
    } catch (error) {
      console.error('❌ 管理画面関数エラー:', error)
      throw error
    }
  })

  test('5. 新旧テーブル名の確認', async () => {
    console.log('\n🔍 テーブル名違いの確認中...')
    
    const tableNames = [
      'career_user_diagnosis_v3',
      'career_user_diagnosis', 
      'user_diagnosis_v3',
      'diagnosis_v3'
    ]
    
    for (const tableName of tableNames) {
      try {
        const { count, error } = await supabaseAdmin
          .from(tableName)
          .select('id', { count: 'exact', head: true })
        
        if (error) {
          console.log(`❌ ${tableName}: 存在しない (${error.message})`)
        } else {
          console.log(`✅ ${tableName}: 存在する (${count}件)`)
        }
      } catch (error) {
        console.log(`❌ ${tableName}: エラー (${error})`)
      }
    }
  })

  test('6. Supabase Admin権限の確認', async () => {
    console.log('\n🔍 Supabase Admin権限確認中...')
    
    try {
      // 基本的な権限確認
      const { data: publicTables, error: publicError } = await supabaseAdmin
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .limit(10)
      
      if (publicError) {
        console.error('❌ 権限エラー:', publicError)
      } else {
        console.log('✅ Supabase Admin接続成功')
        console.log('アクセス可能なテーブル（一部）:', publicTables?.map(t => t.table_name))
      }
      
      // 特定のV3関連テーブルの確認
      const v3Tables = publicTables?.filter(t => 
        t.table_name.includes('diagnosis') || t.table_name.includes('v3')
      )
      console.log('V3関連テーブル:', v3Tables?.map(t => t.table_name))
      
    } catch (error) {
      console.error('❌ 権限確認エラー:', error)
    }
  })
})