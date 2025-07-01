/**
 * 実際のClaude APIテストスクリプト
 * Node.jsで直接実行してAPIの動作を確認
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// .envファイルから環境変数を読み込み
function loadEnvFile() {
  try {
    const envPath = path.join(__dirname, '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["'](.*)["']$/, '$1');
          process.env[key] = value;
        }
      }
    });
    
    console.log('📄 .env file loaded successfully');
  } catch (error) {
    console.log('⚠️ Could not load .env file:', error.message);
  }
}

// .envファイルを読み込み
loadEnvFile();

// 環境変数からAPIキーを取得
const API_KEY = process.env.ANTHROPIC_API_KEY;

if (!API_KEY) {
  console.log('❌ ANTHROPIC_API_KEY not found in .env file');
  console.log('💡 Make sure your .env file contains: ANTHROPIC_API_KEY=your-key-here');
  process.exit(1);
}

console.log('✅ API key found:', API_KEY.substring(0, 20) + '...');

// テスト用プロンプト
const testPrompt = `あなたは温かく共感的なAIキャリアカウンセラーとして、この方の心に寄り添いながら、深く個別化されたパーソナル診断を実行してください。

【回答データ】
【質問1】今の仕事について、率直にどう感じていますか？
【回答】毎日仕事に行くのが憂鬱で、上司からのプレッシャーがきつく、長時間労働で疲れ果てています。このまま続けていても将来が見えません。

【質問2】仕事で最もストレスを感じるのはどのような時ですか？
【回答】職場の人間関係が最悪で、パワハラもあります。ストレスで眠れない日が続いており、体調も悪化しています。

【質問3】朝起きた時、仕事に対するモチベーションやエネルギーはどの程度ありますか？
【回答】やる気が全くなく、モチベーションを保つのが困難です。転職を考えていますが、不安もあります。

【回答形式】以下のJSONで、感情共感を最重視し、「あなた」視点で完全にパーソナライズして回答:

{
  "result_type": "診断タイプ",
  "confidence_level": "high", 
  "urgency_level": "判定結果",
  "personal_summary": "あなたの気持ちに共感し、強みを認め、希望を示す温かいメッセージ（250-300字）",
  "emotional_connection": {
    "recognition": "あなたが感じている○○という気持ち、痛いほどよく分かります",
    "validation": "そう感じるのは当然で、あなたは何も悪くありません",
    "hope_message": "でも大丈夫。あなたには必ず道があります"
  },
  "personal_insights": {
    "your_situation_analysis": "あなたの状況分析",
    "emotional_pattern": "あなたの感情パターン", 
    "stress_response": "あなたのストレス反応",
    "motivation_drivers": ["あなたのやる気の源1", "源2"],
    "career_strengths": ["あなたの強み1", "強み2"],
    "growth_areas": ["あなたの成長領域1", "領域2"]
  }
}`;

// Claude API呼び出し
function callClaudeAPI() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 800,
      temperature: 0.1,
      messages: [{ role: 'user', content: testPrompt }]
    });

    const options = {
      hostname: 'api.anthropic.com',
      port: 443,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (error) {
          reject(new Error(`JSON parse error: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(postData);
    req.end();
  });
}

// テスト実行
async function runTest() {
  console.log('🚀 Starting real Claude API test...');
  console.log('📝 Testing with emotional stress scenario...');
  
  const startTime = Date.now();

  try {
    const response = await callClaudeAPI();
    const endTime = Date.now();
    
    console.log(`⏱️ API call completed in ${endTime - startTime}ms`);
    
    if (response.error) {
      console.log('❌ API Error:', response.error);
      return;
    }

    if (!response.content || !response.content[0] || !response.content[0].text) {
      console.log('❌ Unexpected response format:', response);
      return;
    }

    const responseText = response.content[0].text;
    console.log('📄 Raw response length:', responseText.length);
    console.log('📄 Raw response preview:', responseText.substring(0, 200) + '...');
    console.log('\n' + '='.repeat(80) + '\n');

    // JSON解析を試行
    try {
      let jsonText = responseText.trim();
      
      // Markdownコードブロックを除去
      if (jsonText.includes('```json')) {
        const start = jsonText.indexOf('```json') + 7;
        const end = jsonText.lastIndexOf('```');
        jsonText = jsonText.substring(start, end).trim();
        console.log('📦 Extracted JSON from markdown block');
      }
      
      const parsed = JSON.parse(jsonText);
      console.log('✅ JSON parsing successful!');
      console.log('📊 Result type:', parsed.result_type);
      console.log('🎯 Confidence level:', parsed.confidence_level);
      console.log('⚡ Urgency level:', parsed.urgency_level);
      console.log('💭 Personal summary preview:', parsed.personal_summary?.substring(0, 100) + '...');
      console.log('❤️ Recognition:', parsed.emotional_connection?.recognition);
      console.log('✅ Validation:', parsed.emotional_connection?.validation);
      console.log('🌟 Hope message:', parsed.emotional_connection?.hope_message);
      
      if (parsed.personal_insights) {
        console.log('🧠 Situation analysis:', parsed.personal_insights.your_situation_analysis?.substring(0, 80) + '...');
        console.log('💪 Career strengths:', parsed.personal_insights.career_strengths);
        console.log('📈 Growth areas:', parsed.personal_insights.growth_areas);
      }
      
      // フォールバック診断かチェック
      const isFallback = 
        parsed.personal_summary?.includes('システムエラー') ||
        parsed.personal_summary?.includes('システムの制約') ||
        parsed.personal_insights?.your_situation_analysis?.includes('専門家との個別相談が効果的です');
      
      if (isFallback) {
        console.log('⚠️ WARNING: This appears to be a fallback diagnosis');
      } else {
        console.log('🎉 SUCCESS: This is a real AI-generated diagnosis!');
      }
      
    } catch (parseError) {
      console.log('❌ JSON parsing failed:', parseError.message);
      console.log('🔧 Attempting repair...');
      
      // 簡単な修復を試行
      let repairedJson = responseText.trim();
      
      // 不完全な文字列を修復
      const lastQuote = repairedJson.lastIndexOf('"');
      const lastBrace = repairedJson.lastIndexOf('}');
      
      if (lastQuote > lastBrace) {
        repairedJson = repairedJson.substring(0, lastQuote + 1) + '"}';
      }
      
      // 不足している閉じ括弧を追加
      const openBraces = (repairedJson.match(/{/g) || []).length;
      const closeBraces = (repairedJson.match(/}/g) || []).length;
      const missingBraces = openBraces - closeBraces;
      
      if (missingBraces > 0) {
        repairedJson += '}'.repeat(missingBraces);
      }
      
      try {
        const repaired = JSON.parse(repairedJson);
        console.log('🔧 JSON repair successful!');
        console.log('📊 Repaired result type:', repaired.result_type);
        console.log('💭 Repaired summary:', repaired.personal_summary?.substring(0, 100) + '...');
      } catch (repairError) {
        console.log('❌ JSON repair also failed:', repairError.message);
        console.log('📄 Problematic JSON preview:', responseText.substring(0, 500) + '...');
      }
    }
    
  } catch (error) {
    console.log('❌ API call failed:', error.message);
    
    if (error.message.includes('401')) {
      console.log('💡 Check your ANTHROPIC_API_KEY');
    } else if (error.message.includes('rate limit')) {
      console.log('💡 API rate limit reached - try again later');
    } else if (error.message.includes('timeout')) {
      console.log('💡 Request timed out - network may be slow');
    }
  }
}

// 実行
runTest().then(() => {
  console.log('\n✨ Test completed');
}).catch((error) => {
  console.error('💥 Unexpected error:', error);
});