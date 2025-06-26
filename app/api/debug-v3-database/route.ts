/**
 * V3データベース調査用デバッグAPI
 */

import { supabaseAdmin } from '@/lib/supabase'
import { getV3DiagnosisListForAdmin, getV3DiagnosisStats, getV3ServiceClickStats } from '@/lib/v3/database'
import { NextResponse } from 'next/server'

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: []
  }

  // テスト1: テーブル存在確認
  console.log('\n🔍 1. テーブル存在確認中...')
  try {
    const { data, error } = await supabaseAdmin
      .from('career_user_diagnosis_v3')
      .select('id', { count: 'exact', head: true })
    
    if (error) {
      results.tests.push({
        name: 'テーブル存在確認',
        status: 'error',
        error: error.message,
        details: error
      })
      console.error('❌ テーブルアクセスエラー:', error)
    } else {
      results.tests.push({
        name: 'テーブル存在確認',
        status: 'success',
        recordCount: data
      })
      console.log('✅ career_user_diagnosis_v3テーブルは存在します。レコード数:', data)
    }
  } catch (error) {
    results.tests.push({
      name: 'テーブル存在確認',
      status: 'error',
      error: String(error)
    })
    console.error('❌ テーブル確認エラー:', error)
  }

  // テスト2: テーブル構造確認 (PostgreSQL直接クエリ)
  console.log('\n🔍 2. テーブル構造確認中...')
  try {
    // PostgreSQLの直接クエリでカラム情報を取得
    const { data: columns, error } = await supabaseAdmin
      .rpc('exec_sql', { 
        sql: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = 'career_user_diagnosis_v3' 
            AND table_schema = 'public'
          ORDER BY ordinal_position;
        `
      })
    
    if (error) {
      console.error('❌ RPC実行エラー、代替方法を試行:', error)
      
      // 直接テーブルから1レコード取得してキー確認
      const { data: sampleRecord, error: sampleError } = await supabaseAdmin
        .from('career_user_diagnosis_v3')
        .select('*')
        .limit(1)
        .single()
      
      if (sampleError) {
        results.tests.push({
          name: 'テーブル構造確認',
          status: 'error',
          error: sampleError.message
        })
      } else {
        const columnNames = Object.keys(sampleRecord || {})
        results.tests.push({
          name: 'テーブル構造確認',
          status: 'success',
          method: 'sample_record_keys',
          columnNames: columnNames,
          hasColumnBased: columnNames.includes('q1_text') && columnNames.includes('q2_text'),
          hasJsonBased: columnNames.includes('text_answers')
        })
        console.log('✅ テーブルカラム (サンプルレコードから):', columnNames)
        console.log('✅ カラムベース構造:', columnNames.includes('q1_text'))
        console.log('✅ JSONベース構造:', columnNames.includes('text_answers'))
      }
    } else {
      results.tests.push({
        name: 'テーブル構造確認',
        status: 'success',
        columns: columns
      })
      console.log('✅ テーブルカラム一覧:')
      columns?.forEach((col: any) => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`)
      })
    }
  } catch (error) {
    results.tests.push({
      name: 'テーブル構造確認',
      status: 'error',
      error: String(error)
    })
    console.error('❌ カラム確認エラー:', error)
  }

  // テスト3: サンプルデータ取得
  console.log('\n🔍 3. サンプルデータ取得中...')
  try {
    const { count, error: countError } = await supabaseAdmin
      .from('career_user_diagnosis_v3')
      .select('id', { count: 'exact', head: true })
    
    const { data: sampleData, error: dataError } = await supabaseAdmin
      .from('career_user_diagnosis_v3')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(3)
    
    if (countError || dataError) {
      results.tests.push({
        name: 'サンプルデータ取得',
        status: 'error',
        countError: countError?.message,
        dataError: dataError?.message
      })
    } else {
      results.tests.push({
        name: 'サンプルデータ取得',
        status: 'success',
        totalCount: count,
        sampleCount: sampleData?.length,
        sampleData: sampleData?.map(record => ({
          session_id: record.session_id,
          created_at: record.created_at,
          is_completed: record.is_completed,
          completed_questions: record.completed_questions,
          total_questions: record.total_questions,
          q1_text_preview: record.q1_text ? record.q1_text.substring(0, 50) + '...' : '未回答'
        }))
      })
      console.log(`✅ 総レコード数: ${count}件`)
      console.log(`✅ サンプルデータ (最新${sampleData?.length || 0}件):`)
      sampleData?.forEach((record, index) => {
        console.log(`  ${index + 1}. SessionID: ${record.session_id}`)
        console.log(`     完了状況: ${record.is_completed ? '完了' : '進行中'}`)
        console.log(`     回答数: ${record.completed_questions}/${record.total_questions}`)
      })
    }
  } catch (error) {
    results.tests.push({
      name: 'サンプルデータ取得',
      status: 'error',
      error: String(error)
    })
    console.error('❌ データ確認エラー:', error)
  }

  // テスト4: 管理画面関数テスト
  console.log('\n🔍 4. 管理画面関数テスト中...')
  try {
    // getV3DiagnosisListForAdmin関数のテスト
    console.log('4-1. getV3DiagnosisListForAdmin関数テスト')
    const listResult = await getV3DiagnosisListForAdmin(5)
    
    // getV3DiagnosisStats関数のテスト
    console.log('4-2. getV3DiagnosisStats関数テスト')
    const statsResult = await getV3DiagnosisStats()
    
    // getV3ServiceClickStats関数のテスト
    console.log('4-3. getV3ServiceClickStats関数テスト')
    const clickStatsResult = await getV3ServiceClickStats()
    
    results.tests.push({
      name: '管理画面関数テスト',
      status: 'success',
      getV3DiagnosisListForAdmin: {
        dataLength: listResult.data?.length,
        count: listResult.count,
        sampleRecord: listResult.data?.[0] ? {
          session_id: listResult.data[0].session_id,
          is_completed: listResult.data[0].is_completed,
          completed_questions: listResult.data[0].completed_questions,
        } : null
      },
      getV3DiagnosisStats: statsResult,
      getV3ServiceClickStats: {
        serviceCount: clickStatsResult.length,
        topServices: clickStatsResult.slice(0, 3)
      }
    })
    
    console.log('✅ 管理画面関数テスト完了')
    console.log('リスト取得結果:', {
      dataLength: listResult.data?.length,
      count: listResult.count
    })
    console.log('統計結果:', statsResult)
    console.log('クリック統計結果:', {
      serviceCount: clickStatsResult.length
    })
    
  } catch (error) {
    results.tests.push({
      name: '管理画面関数テスト',
      status: 'error',
      error: String(error)
    })
    console.error('❌ 管理画面関数エラー:', error)
  }

  // テスト5: 他のテーブル名確認
  console.log('\n🔍 5. 他のテーブル名確認中...')
  const tableNames = [
    'career_user_diagnosis_v3',
    'career_user_diagnosis', 
    'user_diagnosis_v3',
    'diagnosis_v3'
  ]
  
  const tableResults: any = {}
  
  for (const tableName of tableNames) {
    try {
      const { count, error } = await supabaseAdmin
        .from(tableName)
        .select('id', { count: 'exact', head: true })
      
      if (error) {
        tableResults[tableName] = { status: 'not_found', error: error.message }
        console.log(`❌ ${tableName}: 存在しない (${error.message})`)
      } else {
        tableResults[tableName] = { status: 'exists', count }
        console.log(`✅ ${tableName}: 存在する (${count}件)`)
      }
    } catch (error) {
      tableResults[tableName] = { status: 'error', error: String(error) }
      console.log(`❌ ${tableName}: エラー (${error})`)
    }
  }
  
  results.tests.push({
    name: 'テーブル名確認',
    status: 'completed',
    tables: tableResults
  })

  return NextResponse.json(results, { status: 200 })
}