// components/ServiceRecommendations.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ExternalLink, Star, ThumbsUp } from "lucide-react"
import { RecommendedService } from "@/lib/services"
import { trackEvent } from "@/lib/analytics"
import { addClickedService } from "@/lib/storage"
import { useState } from "react"

interface ServiceRecommendationsProps {
  services: RecommendedService[]
}

export default function ServiceRecommendations({ services }: ServiceRecommendationsProps) {
  console.log("ServiceRecommendations received services:", services)
  const [imageLoadStates, setImageLoadStates] = useState<{[key: string]: boolean}>({})
  
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
      <div className="grid gap-6">
        {services.map((service, index) => {
          const getRankStyle = (index: number) => {
            switch (index) {
              case 0:
                return {
                  cardClass: "relative hover:shadow-2xl transition-all duration-300 border-2 border-yellow-400 rounded-xl bg-gradient-to-br from-yellow-50 to-orange-50 shadow-lg transform hover:-translate-y-2",
                  rankBadge: "w-16 sm:w-20 h-16 sm:h-20 bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xl sm:text-2xl shadow-lg border-4 border-white",
                  icon: "🏆",
                  text: "1位"
                }
              case 1:
                return {
                  cardClass: "relative hover:shadow-xl transition-all duration-300 border-2 border-gray-400 rounded-xl bg-gradient-to-br from-gray-50 to-blue-50 shadow-md transform hover:-translate-y-1",
                  rankBadge: "w-14 sm:w-16 h-14 sm:h-16 bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600 rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-lg border-4 border-white",
                  icon: "🥈",
                  text: "2位"
                }
              case 2:
                return {
                  cardClass: "relative hover:shadow-xl transition-all duration-300 border-2 border-orange-400 rounded-xl bg-gradient-to-br from-orange-50 to-yellow-50 shadow-md transform hover:-translate-y-1",
                  rankBadge: "w-14 sm:w-16 h-14 sm:h-16 bg-gradient-to-br from-orange-400 via-orange-500 to-yellow-600 rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-lg border-4 border-white",
                  icon: "🥉",
                  text: "3位"
                }
              default:
                return {
                  cardClass: "relative hover:shadow-lg transition-all duration-300 border border-blue-200 rounded-lg bg-white transform hover:-translate-y-1",
                  rankBadge: "w-12 sm:w-14 h-12 sm:h-14 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-md border-3 border-white",
                  icon: "⭐",
                  text: `${index + 1}位`
                }
            }
          }
          
          const rankStyle = getRankStyle(index)
          
          return (
            <Card 
              key={service.id} 
              className={rankStyle.cardClass}
            >
              {/* ランキングバッジ（左上に配置） */}
              <div className="absolute -top-3 -left-3 z-20">
                <div className={rankStyle.rankBadge}>
                  <div className="text-center">
                    <div className="text-lg sm:text-xl">{rankStyle.icon}</div>
                    <div className="text-xs font-bold">{rankStyle.text}</div>
                  </div>
                </div>
              </div>
              
              <CardHeader className="pt-8">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between">
                  {/* スマホ: 縦並び、PC: 横並び */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 flex-1 ml-4 sm:ml-12">
                    <CardTitle 
                      className={`leading-tight text-center sm:text-left order-1 sm:order-2 cursor-pointer transition-all duration-200 ${
                        index === 0 
                          ? 'text-3xl sm:text-4xl font-black text-black hover:text-gray-900 drop-shadow-xl' 
                          : index === 1
                          ? 'text-2xl sm:text-3xl font-bold text-black hover:text-gray-900 drop-shadow-lg'
                          : index === 2
                          ? 'text-xl sm:text-2xl font-bold text-black hover:text-gray-900 drop-shadow-md'
                          : 'text-lg sm:text-xl font-bold text-gray-800 hover:text-blue-600'
                      }`}
                      style={{
                        textShadow: index === 0 
                          ? '1px 1px 0px #fbbf24, -1px -1px 0px #fbbf24, 1px -1px 0px #fbbf24, -1px 1px 0px #fbbf24, 2px 2px 0px #f59e0b, 0px 0px 8px #fbbf24'
                          : index === 1
                          ? '1px 1px 0px #e5e7eb, -1px -1px 0px #e5e7eb, 1px -1px 0px #e5e7eb, -1px 1px 0px #e5e7eb, 2px 2px 0px #6b7280, 0px 0px 8px #9ca3af'
                          : index === 2
                          ? '1px 1px 0px #fed7aa, -1px -1px 0px #fed7aa, 1px -1px 0px #fed7aa, -1px 1px 0px #fed7aa, 2px 2px 0px #ea580c, 0px 0px 8px #f97316'
                          : undefined
                      }}
                      onClick={() => {
                        console.log('=== TITLE CLICK DEBUG ===')
                        console.log('Service object:', service)
                        console.log('Service URL:', service.url)
                        console.log('Service ID:', service.id)
                        console.log('Service name:', service.name)
                        
                        addClickedService({ id: service.id, name: service.name, url: service.url })
                        trackEvent('service_title_click', {
                          button_location: 'final_diagnosis_page',
                          service_name: service.name,
                          service_id: service.id,
                          service_rank: index + 1,
                          click_type: 'title_click'
                        })
                        
                        window.open(service.url, '_blank')
                      }}
                    >
                      {service.name}
                    </CardTitle>
                    {service.image && (
                      <div className="relative w-full h-56 sm:w-32 sm:h-32 md:w-40 md:h-40 flex-shrink-0 mx-auto sm:mx-0 order-2 sm:order-1">
                        {!imageLoadStates[service.id] && (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-xl border border-gray-200">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 border-3 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                          </div>
                        )}
                        <img 
                          src={service.image} 
                          alt={service.name}
                          className="w-full h-56 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-xl object-contain sm:object-cover shadow-md hover:shadow-lg transition-shadow"
                          onLoad={() => setImageLoadStates(prev => ({...prev, [service.id]: true}))}
                          onError={() => setImageLoadStates(prev => ({...prev, [service.id]: false}))}
                          style={{ display: imageLoadStates[service.id] ? 'block' : 'none' }}
                        />
                      </div>
                    )}
                  </div>
                </div>
                {service.reason && (
                  <div className="flex items-center gap-1 text-sm text-blue-600 mb-4">
                    <ThumbsUp className="w-4 h-4" />
                    <span>{service.reason}</span>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <p className="text-gray-700 text-sm leading-relaxed mb-4">
                  {service.description}
                </p>
                
                <div className="flex flex-wrap gap-2 mb-6">
                  {service.tags.slice(0, 3).map((tag) => (
                    <span 
                      key={tag}
                      className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <Button
                  className={`w-full transition-all duration-300 transform hover:scale-105 border-0 rounded-xl ${
                    index === 0 
                      ? "bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 hover:from-yellow-500 hover:via-yellow-600 hover:to-orange-600 text-black font-black text-lg py-6 px-6 shadow-xl hover:shadow-2xl animate-pulse hover:animate-none" 
                      : index === 1
                      ? "bg-gradient-to-r from-gray-400 via-gray-500 to-gray-600 hover:from-gray-500 hover:via-gray-600 hover:to-gray-700 text-white font-bold py-5 px-4 shadow-lg hover:shadow-xl animate-pulse hover:animate-none"
                      : index === 2
                      ? "bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 hover:from-orange-500 hover:via-orange-600 hover:to-orange-700 text-white font-bold py-5 px-4 shadow-lg hover:shadow-xl animate-pulse hover:animate-none"
                      : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-5 px-4 shadow-md hover:shadow-xl"
                  }`}
                  onClick={() => {
                    console.log('=== BUTTON CLICK DEBUG ===')
                    console.log('Service object:', service)
                    console.log('Service URL:', service.url)
                    console.log('Service ID:', service.id)
                    console.log('Service name:', service.name)
                    
                    addClickedService({ id: service.id, name: service.name, url: service.url })
                    trackEvent('service_detail_click', {
                      button_location: 'final_diagnosis_page',
                      service_name: service.name,
                      service_id: service.id,
                      service_rank: index + 1,
                      button_text: index === 0 ? '🚀 今すぐ詳細をチェック！' : '✨ 詳細を確認する',
                      click_position: index + 1,
                      is_top_recommendation: index === 0
                    })
                    
                    window.open(service.url, '_blank')
                  }}
                >
                  {index === 0 ? (
                    <>
                      <span>🚀 今すぐ詳細をチェック！</span>
                      <ExternalLink className="w-5 h-5 ml-2" />
                    </>
                  ) : (
                    <>
                      <span>✨ 詳細を確認する</span>
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