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
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
          <Star className="w-6 h-6 text-yellow-500" />
          あなたにおすすめのサービス〜！
          <Star className="w-6 h-6 text-yellow-500" />
        </h2>
        <p className="text-gray-600">診断結果に基づいて、ぴったりのサービスを選んでみました✨</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {services.map((service, index) => (
          <Card key={service.id} className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg leading-tight flex-1">
                  {service.name}
                </CardTitle>
                {index === 0 && (
                  <div className="ml-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                    イチオシ！
                  </div>
                )}
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
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                onClick={
                  () => {
                    console.log('clicked', {service})
                    addClickedService({ id: service.id, name: service.name, url: service.url })
                    trackEvent('view_service_'+service.id, { service: service.name })
                    window.open(service.url, '_blank')
                  }
                }
              >
                詳細を見る
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center text-sm text-gray-500">
        <p>気になるサービスが見つからなくても大丈夫！</p>
        <p>まずは一歩ずつ、自分のペースで進んでいきましょうね〜😊</p>
      </div>
    </div>
  )
}
