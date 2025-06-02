// lib/services.ts
export interface ServiceInfo {
    id: string
    name: string
    description: string
    category: string[]
    targetType: string[]
    urgencyLevel: string[]
    url: string
    tags: string[]
  }
  
  // 推奨サービス用の拡張型
  export interface RecommendedService extends ServiceInfo {
    score: number
    reason?: string
  }
  
  /* ------------------------------------------------------------------ */
  /* 案件マスタ                                                            */
  /* ------------------------------------------------------------------ */
  export const services: ServiceInfo[] = [
    /* 退職・労務系 ---------------------------------------------------- */
    {
      id: "taishoku-jobs",
      name: "退職代行Jobs｜弁護士監修＆労働組合連携！の退職代行サービス",
      description: "今すぐ辞めたいけど言い出しづらい人にぴったり。",
      category: ["退職代行"],
      targetType: ["疲労限界型"],
      urgencyLevel: ["high"],
      url: "http://msm.to/D5GzMLt",
      tags: ["退職", "ストレス", "ブラック企業"]
    },
  
    /* 転職支援 -------------------------------------------------------- */
    {
      id: "albatross",
      name: "アルバトロス転職｜転職支援サービスの申し込み",
      description: "総合型エージェント。幅広い求人を比較したい人向け。",
      category: ["転職支援"],
      targetType: ["現状維持迷い型", "成長志向型"],
      urgencyLevel: ["medium", "low"],
      url: "http://msm.to/F3DdYYm",
      tags: ["転職", "キャリアアップ", "一般転職"]
    },
    {
      id: "se-navi",
      name: "社内SE転職ナビ｜社内SE・情シス特化の転職サイト",
      description: "社内SEでワークライフバランスを目指したい IT エンジニアに。",
      category: ["IT転職"],
      targetType: ["疲労限界型", "現状維持迷い型"],
      urgencyLevel: ["medium", "high"],
      url: "https://px.a8.net/svt/ejp?a8mat=3Z92DF+BOXRI2+3IZO+I4FNM",
      tags: ["社内SE", "IT", "ワークライフバランス"]
    },
    {
      id: "m-and-a-beginners",
      name: "M&A BEGINNERS｜M&A業界特化の転職エージェント",
      description: "M&A 仲介・アドバイザリー業界へキャリアチェンジしたい人向け。",
      category: ["転職支援"],
      targetType: ["成長志向型"],
      urgencyLevel: ["medium", "low"],
      url: "http://msm.to/FRtWvpf",
      tags: ["M&A", "金融", "キャリアアップ"]
    },
    {
      id: "hr-career-agent",
      name: "HR CAREER AGENT｜人材業界特化の転職エージェント",
      description: "法人営業・キャリアアドバイザー経験を活かして人材業界へ。",
      category: ["転職支援"],
      targetType: ["成長志向型", "現状維持迷い型"],
      urgencyLevel: ["medium"],
      url: "http://msm.to/8W1WKda",
      tags: ["人材業界", "営業", "キャリアチェンジ"]
    },
    {
      id: "careerpark",
      name: "キャリアパーク｜就活・転職ノウハウメディア",
      description: "適職診断やガイド資料が無料でダウンロードできる総合サイト。",
      category: ["転職支援"],
      targetType: ["現状維持迷い型"],
      urgencyLevel: ["low"],
      url: "https://h.accesstrade.net/sp/cc?rk=0100pmwp00nyac",
      tags: ["就活", "自己分析", "書類対策"]
    },
    {
      id: "uzuz",
      name: "第二新卒・既卒・フリーター・ニートの就職サポート【UZUZ】",
      description: "20代の就業未経験・短期離職のサポートに強いエージェント。",
      category: ["就職支援"],
      targetType: ["現状維持迷い型", "成長志向型"],
      urgencyLevel: ["high", "medium"],
      url: "https://h.accesstrade.net/sp/cc?rk=0100pw7e00nyac",
      tags: ["第二新卒", "既卒", "未経験OK"]
    },
  
    /* フリーランス・副業 -------------------------------------------- */
    {
      id: "tech-stock",
      name: "Tech Stock｜フリーランスエンジニア向け案件紹介",
      description: "高単価 × 直請け案件が豊富。独立を後押し。",
      category: ["フリーランス", "IT"],
      targetType: ["成長志向型"],
      urgencyLevel: ["low", "medium"],
      url: "https://px.a8.net/svt/ejp?a8mat=3Z95JB+57JUD6+3T80+5ZMCI",
      tags: ["フリーランス", "エンジニア", "独立"]
    },
    {
      id: "side-business-seminar",
      name: "副業セミナー",
      description: "会社員のまま収入の柱を増やしたい人向けのオンライン講座。",
      category: ["副業", "スキルアップ"],
      targetType: ["現状維持迷い型", "成長志向型"],
      urgencyLevel: ["low"],
      url: "https://h.accesstrade.net/sp/cc?rk=0100pqmy00nyac",
      tags: ["副業", "稼ぐ", "リスク分散"]
    },
  
    /* 学習・留学 ------------------------------------------------------ */
    {
      id: "merise",
      name: "MeRISE留学（ミライズ）｜フィリピン・セブ島英語留学",
      description: "英語と IT を短期集中で学びながらリフレッシュ。",
      category: ["スキルアップ", "留学"],
      targetType: ["成長志向型"],
      urgencyLevel: ["low"],
      url: "https://px.a8.net/svt/ejp?a8mat=3Z91L1+1O52WQ+3UZ2+BZO4H",
      tags: ["留学", "英語", "リフレッシュ"]
    },
    {
      id: "media-labo",
      name: "Media Labo｜ライティング×マーケスキルの実践型スクール",
      description: "文章とマーケを両方磨きたい Web ライターの登竜門。",
      category: ["スキルアップ"],
      targetType: ["成長志向型"],
      urgencyLevel: ["low"],
      url: "http://msm.to/7ditacB",
      tags: ["ライティング", "マーケティング", "オンライン講座"]
    },
  
    /* 特定業界・働き方 ---------------------------------------------- */
    {
      id: "resort-baito",
      name: "リゾバ.com｜業界最大手のリゾートバイト求人",
      description: "住み込みで貯金もリフレッシュも叶えたい人に人気。",
      category: ["リゾートバイト"],
      targetType: ["現状維持迷い型", "成長志向型"],
      urgencyLevel: ["low", "medium"],
      url: "https://px.a8.net/svt/ejp?a8mat=35JR28+C7ZMUY+42GS+61JSH",
      tags: ["住み込み", "短期", "旅行気分"]
    },
    {
      id: "kokokara-driver",
      name: "ココカラ・ドライバー｜ドライバー職の無料会員登録",
      description: "普通免許から挑戦できる配送ドライバー案件が豊富。",
      category: ["転職支援"],
      targetType: ["現状維持迷い型"],
      urgencyLevel: ["medium"],
      url: "http://msm.to/2qGWEkY",
      tags: ["ドライバー", "配送", "未経験OK"]
    },
    {
      id: "tsunaguba",
      name: "ツナグバ｜U・I ターン支援型ジョブマッチング",
      description: "地方移住してゆったり働きたい人向け。",
      category: ["地方転職"],
      targetType: ["成長志向型", "現状維持迷い型"],
      urgencyLevel: ["low"],
      url: "https://h.accesstrade.net/sp/cc?rk=0100pmg800nyac",
      tags: ["地方移住", "ライフスタイル", "地域活性"]
    }
  ]