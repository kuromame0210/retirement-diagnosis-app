export interface V2Question {
  id: string
  question: string
  emoji: string
  type: 'single' | 'multiple' | 'demographic'
  maxSelections?: number
  options: Array<{
    value: string
    label: string
    emoji?: string
  }>
}

export const v2Questions: V2Question[] = [
  {
    id: "satisfaction",
    question: "月曜日の朝、職場に向かうとき正直どう感じる？",
    emoji: "😰",
    type: "single",
    options: [
      { value: "excited", label: "ワクワクしてる！今日も頑張ろう", emoji: "😊" },
      { value: "neutral", label: "普通。仕事だから仕方ない", emoji: "😐" },
      { value: "heavy", label: "気が重い。行きたくない", emoji: "😟" },
      { value: "dread", label: "吐き気がする。本当に辛い", emoji: "🤢" }
    ]
  },
  {
    id: "night_thoughts",
    question: "夜寝る前、一番よく考えることは？",
    emoji: "🌙",
    type: "single",
    options: [
      { value: "tomorrow_work", label: "明日の仕事のことで頭がいっぱい" },
      { value: "escape_thoughts", label: "「逃げ出したい」「辞めたい」" },
      { value: "better_life", label: "もっと良い人生があるはず" },
      { value: "peaceful", label: "特に仕事のことは考えない" },
      { value: "skills_growth", label: "スキルアップや将来の計画" }
    ]
  },
  {
    id: "breaking_point",
    question: "最近「もう無理かも」と思った瞬間は？（最大3つ）",
    emoji: "💔",
    type: "multiple",
    maxSelections: 3,
    options: [
      { value: "boss_unreasonable", label: "上司の理不尽な要求・パワハラ", emoji: "😡" },
      { value: "overtime_hell", label: "終わらない残業・休日出勤", emoji: "⏰" },
      { value: "salary_reality", label: "給与明細を見たとき", emoji: "💸" },
      { value: "health_warning", label: "体調を崩した・病院に行った", emoji: "🏥" },
      { value: "friends_success", label: "同期・友人の成功を聞いたとき", emoji: "😔" },
      { value: "family_time", label: "家族との時間が全く取れない", emoji: "👨‍👩‍👧‍👦" },
      { value: "skill_stagnation", label: "成長実感がゼロ・やりがいなし", emoji: "📉" }
    ]
  },
  {
    id: "demographics",
    question: "あなたについて教えて",
    emoji: "👤",
    type: "demographic",
    options: [
      // 年代
      { value: "early_20s", label: "20代前半" },
      { value: "late_20s", label: "20代後半" },
      { value: "early_30s", label: "30代前半" },
      { value: "late_30s", label: "30代後半" },
      { value: "40s_plus", label: "40代以上" },
      // 職種
      { value: "office_sales", label: "事務・営業" },
      { value: "it_tech", label: "IT・技術" },
      { value: "specialist", label: "専門職（医療・法律・会計等）" },
      { value: "service", label: "サービス業・接客" },
      { value: "manufacturing", label: "製造業・工場勤務" },
      { value: "other", label: "その他" }
    ]
  },
  {
    id: "money_reality",
    question: "お金の現実、正直どう？",
    emoji: "💰",
    type: "single",
    options: [
      { value: "barely_survive", label: "生活でギリギリ。貯金なんて無理" },
      { value: "no_luxury", label: "生活はできるが贅沢は一切できない" },
      { value: "modest_saving", label: "少しずつ貯金はできている" },
      { value: "comfortable", label: "そこそこ余裕がある" },
      { value: "wealthy", label: "お金の心配はほとんどない" }
    ]
  },
  {
    id: "escape_plan",
    question: "本音：今すぐ辞められるとしたら？",
    emoji: "🏃‍♀️",
    type: "single",
    options: [
      { value: "immediate_quit", label: "今すぐ辞める！一刻も早く", emoji: "🏃‍♀️" },
      { value: "planned_exit", label: "3ヶ月以内に計画的に辞める", emoji: "📋" },
      { value: "careful_transition", label: "半年〜1年かけて慎重に準備", emoji: "🎯" },
      { value: "improvement_first", label: "まず今の職場で改善を試みる", emoji: "🔧" },
      { value: "stay_content", label: "辞める理由がない・満足", emoji: "😌" }
    ]
  },
  {
    id: "ideal_future",
    question: "5年後、理想の自分はどんな働き方をしてる？",
    emoji: "✨",
    type: "single",
    options: [
      { value: "corporate_leader", label: "大企業で管理職・リーダーとして活躍", emoji: "👔" },
      { value: "freelance_expert", label: "フリーランス・個人事業で自由に", emoji: "💻" },
      { value: "startup_challenge", label: "ベンチャー・スタートアップで挑戦", emoji: "🚀" },
      { value: "work_life_balance", label: "程々働いて家族・趣味を大切に", emoji: "⚖️" },
      { value: "specialist_path", label: "専門分野のプロフェッショナル", emoji: "🎓" },
      { value: "entrepreneur", label: "起業・独立して経営者", emoji: "🏢" }
    ]
  },
  {
    id: "skill_confidence",
    question: "正直、自分のスキル・市場価値をどう思う？",
    emoji: "🤔",
    type: "single",
    options: [
      { value: "high_confidence", label: "かなり自信あり。どこでも通用する", emoji: "💪" },
      { value: "moderate_confidence", label: "そこそこ自信あり。選べば転職可能", emoji: "👍" },
      { value: "uncertain", label: "よく分からない。客観視できない", emoji: "🤷" },
      { value: "low_confidence", label: "自信ない。転職は難しそう", emoji: "😰" },
      { value: "very_low", label: "全く自信ない。スキル不足を実感", emoji: "😭" }
    ]
  },
  {
    id: "relationship_reality",
    question: "職場の人間関係、本当のところは？",
    emoji: "👥",
    type: "single",
    options: [
      { value: "toxic_environment", label: "毒だらけ。パワハラ・いじめあり", emoji: "☠️" },
      { value: "cold_distance", label: "冷たい。表面的な付き合いのみ", emoji: "🧊" },
      { value: "superficial", label: "普通。特に深い関係はない", emoji: "😐" },
      { value: "friendly", label: "良好。友好的で働きやすい", emoji: "😊" },
      { value: "family_like", label: "最高。家族のような絆がある", emoji: "🤗" }
    ]
  },
  {
    id: "action_readiness",
    question: "転職活動、実際どこまでやる覚悟ある？",
    emoji: "🎯",
    type: "single",
    options: [
      { value: "serious_hunting", label: "本気で活動中！面接も受けてる", emoji: "🔥" },
      { value: "active_preparation", label: "履歴書作成・求人チェック中", emoji: "📝" },
      { value: "research_phase", label: "情報収集・転職サイト見てる程度", emoji: "👀" },
      { value: "just_thinking", label: "考えてるだけ。具体的行動はゼロ", emoji: "💭" },
      { value: "not_ready", label: "まだ本気じゃない。愚痴レベル", emoji: "😅" }
    ]
  }
]

export interface V2Answers {
  satisfaction: string // 月曜日の朝の気持ち
  night_thoughts: string // 夜寝る前に考えること
  breaking_point: string[] // 「もう無理かも」と思った瞬間（複数選択）
  demographics: {
    age: string
    job: string
  }
  money_reality: string // お金の現実
  escape_plan: string // 今すぐ辞められるとしたら
  ideal_future: string // 5年後の理想の働き方
  skill_confidence: string // 自分のスキル・市場価値
  relationship_reality: string // 職場の人間関係
  action_readiness: string // 転職活動への覚悟
  freeText?: string // フリーテキスト入力（オプション）
}

export const validateV2Answers = (answers: Partial<V2Answers>): boolean => {
  return !!(
    answers.satisfaction &&
    answers.night_thoughts &&
    answers.breaking_point?.length &&
    answers.demographics?.age &&
    answers.demographics?.job &&
    answers.money_reality &&
    answers.escape_plan &&
    answers.ideal_future &&
    answers.skill_confidence &&
    answers.relationship_reality &&
    answers.action_readiness
    // freeTextは任意なのでバリデーションに含めない
  )
}