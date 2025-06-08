// components/ServiceRecommendations.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ExternalLink, Star, ThumbsUp } from "lucide-react"
import { RecommendedService } from "@/lib/services"
import { trackEvent } from "@/lib/analytics"
import { addClickedService } from "@/lib/storage"

interface ServiceRecommendationsProps {
  services: RecommendedService[]
}

export default function ServiceRecommendations({ services }: ServiceRecommendationsProps) {
  if (services.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">現在準備中のサービスがあります〜</p>
        <p className="text-sm text-gray-500 mt-2">もう少々お待ちくださいね！</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        {services.map((service, index) => {
          const getRankDisplay = (index: number) => {
            switch (index) {
              case 0:
                return { icon: "🏆", text: "1位", bgClass: "bg-gradient-to-r from-yellow-400 to-orange-500", textClass: "text-white" }
              case 1:
                return { icon: "🥈", text: "2位", bgClass: "bg-gradient-to-r from-gray-300 to-gray-500", textClass: "text-white" }
              case 2:
                return { icon: "🥉", text: "3位", bgClass: "bg-gradient-to-r from-amber-600 to-yellow-700", textClass: "text-white" }
              default:
                return { icon: "⭐", text: `${index + 1}位`, bgClass: "bg-gradient-to-r from-blue-400 to-blue-600", textClass: "text-white" }
            }
          }
          
          const rank = getRankDisplay(index)
          const cardClass = index === 0 
            ? "hover:shadow-xl transition-all duration-300 border-2 border-yellow-300 bg-gradient-to-br from-yellow-50 to-orange-50" 
            : "hover:shadow-lg transition-shadow duration-300"
          
          return (
            <Card key={service.id} className={cardClass}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className={`leading-tight flex-1 ${index === 0 ? 'text-xl' : 'text-lg'}`}>
                    {service.name}
                  </CardTitle>
                  <div className={`ml-2 ${rank.bgClass} ${rank.textClass} px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1`}>
                    <span>{rank.icon}</span>
                    <span>{rank.text}</span>
                  </div>
                </div>
                {service.reason && (
                  <div className="flex items-center gap-1 text-sm text-blue-600">
                    <ThumbsUp className="w-4 h-4" />
                    <span>{service.reason}</span>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700 text-sm leading-relaxed">
                  {service.description}
                </p>
                
                <div className="flex flex-wrap gap-1">
                  {service.tags.slice(0, 3).map((tag) => (
                    <span 
                      key={tag}
                      className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <Button
                  className={`w-full transition-all duration-300 ${
                    index === 0 
                      ? "bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white font-bold text-lg py-3 shadow-lg hover:shadow-xl transform hover:scale-105" 
                      : "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                  }`}
                  onClick={() => {
                    console.log('clicked', {service})
                    addClickedService({ id: service.id, name: service.name, url: service.url })
                    trackEvent('view_service_'+service.id, { service: service.name, rank: index + 1 })
                    window.open(service.url, '_blank')
                  }}
                >
                  {index === 0 ? (
                    <>
                      <span>🚀 今すぐチェック！</span>
                      <ExternalLink className="w-5 h-5 ml-2" />
                    </>
                  ) : (
                    <>
                      詳細を見る
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="text-center p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
        <p className="text-green-800 font-medium">💡 迷ったときは...</p>
        <p className="text-sm text-green-600 mt-1">
          まずは1位のサービスから詳細をチェックしてみるのがおすすめです！
        </p>
        <p className="text-xs text-green-500 mt-2">
          ✨ 新しい可能性が見つかるかもしれません
        </p>
      </div>
    </div>
  )
}