"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Globe, MessageCircle, Users, Heart } from "lucide-react"
import { ChatCreationFlow } from "@/components/chat-creation-flow"
import { ChatJoinFlow } from "@/components/chat-join-flow"
import { ChatInterface } from "@/components/chat-interface"
import { OneOnOneChatFlow } from "@/components/one-on-one-chat-flow"
import SocketChatInterface from "@/components/socket-chat-interface"

type ViewState = "landing" | "create-chat" | "join-chat" | "1-1-chat" | "chat"

interface ChatData {
  code: string
  language: string
  username: string
  isOneOnOne?: boolean
}

export default function HomePage() {
  const [currentView, setCurrentView] = useState<ViewState>("landing")
  const [hoveredButton, setHoveredButton] = useState<string | null>(null)
  const [chatData, setChatData] = useState<ChatData | null>(null)

  const handleCreateChat = () => {
    setCurrentView("create-chat")
  }

  const handleJoinChat = () => {
    setCurrentView("join-chat")
  }

  const handleOneOnOneChat = () => {
    setCurrentView("1-1-chat")
  }

  const handleBackToHome = () => {
    setCurrentView("landing")
    setChatData(null)
  }

  const handleChatCreated = (data: ChatData) => {
    setChatData(data)
    setCurrentView("chat")
  }

  const handleChatJoined = (data: ChatData) => {
    setChatData(data)
    setCurrentView("chat")
  }

  const handleOneOnOnePaired = (data: ChatData) => {
    setChatData({ ...data, isOneOnOne: true })
    setCurrentView("chat")
  }

  if (currentView === "create-chat") {
    return <ChatCreationFlow onBack={handleBackToHome} onChatCreated={handleChatCreated} />
  }

  if (currentView === "join-chat") {
    return <ChatJoinFlow onBack={handleBackToHome} onChatJoined={handleChatJoined} />
  }

  if (currentView === "1-1-chat") {
    return <OneOnOneChatFlow onBack={handleBackToHome} onPaired={handleOneOnOnePaired} />
  }

  if (currentView === "chat" && chatData) {
    if (chatData.isOneOnOne) {
      return (
        <SocketChatInterface
          roomID={chatData.code}
          username={chatData.username}
          language={chatData.language}
          onLeave={handleBackToHome}
        />
      )
    }
    return <ChatInterface chatData={chatData} onBack={handleBackToHome} />
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 z-20">
        <div className="absolute top-20 left-10 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-20 w-1 h-1 bg-blue-400 rounded-full animate-pulse delay-1000"></div>
        <div className="absolute bottom-32 left-1/4 w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse delay-500"></div>
        <div className="absolute bottom-20 right-1/3 w-1 h-1 bg-blue-400 rounded-full animate-pulse delay-1500"></div>
      </div>

      <div className="absolute inset-0 bg-black/40 z-10"></div>

      <div className="relative z-30 flex flex-col items-center justify-center min-h-screen px-4">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-4">
            Global<span className="text-yellow-400">Chat</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto">
            Connect with people worldwide. Chat in any language, understand everyone.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-8 max-w-4xl">
          <Button
            size="lg"
            className="px-6 py-6 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-all duration-300 transform hover:scale-105 relative border-0"
            onMouseEnter={() => setHoveredButton("create")}
            onMouseLeave={() => setHoveredButton(null)}
            onClick={handleCreateChat}
          >
            <MessageCircle className="mr-3 h-6 w-6" />
            Create a Chat
            {hoveredButton === "create" && (
              <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-3 py-1 rounded text-sm whitespace-nowrap">
                Start a new conversation
              </div>
            )}
          </Button>

          <Button
            size="lg"
            className="px-6 py-6 text-lg font-semibold bg-yellow-500 hover:bg-yellow-600 text-black transition-all duration-300 transform hover:scale-105 relative border-0"
            onMouseEnter={() => setHoveredButton("1-1")}
            onMouseLeave={() => setHoveredButton(null)}
            onClick={handleOneOnOneChat}
          >
            <Heart className="mr-3 h-6 w-6" />
            1-1 Chat
            {hoveredButton === "1-1" && (
              <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-3 py-1 rounded text-sm whitespace-nowrap">
                Random multilingual pairing
              </div>
            )}
          </Button>

          <Button
            size="lg"
            className="px-6 py-6 text-lg font-semibold bg-gray-700 hover:bg-gray-600 text-white transition-all duration-300 transform hover:scale-105 relative border-0"
            onMouseEnter={() => setHoveredButton("join")}
            onMouseLeave={() => setHoveredButton(null)}
            onClick={handleJoinChat}
          >
            <Users className="mr-3 h-6 w-6" />
            Join Chat
            {hoveredButton === "join" && (
              <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-3 py-1 rounded text-sm whitespace-nowrap">
                Enter an existing chat
              </div>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto text-center">
          <div className="p-6 rounded-lg bg-gray-900/80 backdrop-blur-sm border border-gray-700">
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Globe className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">10+ Languages</h3>
            <p className="text-gray-300">Communicate in any language with real-time translation</p>
          </div>

          <div className="p-6 rounded-lg bg-gray-900/80 backdrop-blur-sm border border-gray-700">
            <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-6 h-6 text-yellow-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No Sign-up Required</h3>
            <p className="text-gray-300">Jump into conversations instantly with just a username</p>
          </div>

          <div className="p-6 rounded-lg bg-gray-900/80 backdrop-blur-sm border border-gray-700">
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Real-time Chat</h3>
            <p className="text-gray-300">See original messages and translations simultaneously</p>
          </div>
        </div>
      </div>
    </div>
  )
}
