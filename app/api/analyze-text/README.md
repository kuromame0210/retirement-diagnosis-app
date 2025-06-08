# Text Analysis API

## 概要
このAPIエンドポイントは、基本診断結果とユーザーのテキスト入力を分析し、退職に関する感情状態や問題点を特定します。

## エンドポイント
`POST /api/analyze-text`

## リクエスト形式
```json
{
  "basicResult": {
    // 基本診断の結果オブジェクト
  },
  "textInput": "ユーザーのテキスト入力"
}
```

## レスポンス形式
```json
{
  "emotionalState": "感情状態の分析",
  "keyIssues": ["主要な問題点1", "問題点2", "問題点3"],
  "contradictions": ["矛盾点があれば"],
  "questionTopics": ["深掘りすべきトピック1", "トピック2", "トピック3"],
  "riskLevel": "high/medium/low"
}
```

## 使用技術
- Anthropic Claude 3.5 Sonnet API
- Next.js API Routes

## 環境変数
- `ANTHROPIC_API_KEY`: Anthropic APIキー