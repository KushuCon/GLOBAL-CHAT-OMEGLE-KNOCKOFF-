"use client"

import { useEffect, useState } from "react"
import { getSocket } from "@/lib/socket-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, ArrowLeft } from "lucide-react"

interface Message {
  username: string
  message: string
  translatedMessage?: string
  originalLanguage?: string
  translatedLanguage?: string
  timestamp: number
  isOwn?: boolean
}

interface SocketChatInterfaceProps {
  roomID: string
  username: string
  language: string
  onLeave: () => void
}

export default function SocketChatInterface({ roomID, username, language, onLeave }: SocketChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [messageInput, setMessageInput] = useState("")
  const [partnerLanguage, setPartnerLanguage] = useState<string>("")
  const socket = getSocket()

  useEffect(() => {
    const receiveMessageHandler = (data: {
      message: string
      username: string
      timestamp: number
      translatedMessage?: string
      originalLanguage?: string
      translatedLanguage?: string
    }) => {
      if (data.originalLanguage && data.originalLanguage !== language) {
        setPartnerLanguage(data.originalLanguage)
      }
      setMessages((prev) => [
        ...prev,
        {
          username: data.username,
          message: data.message,
          translatedMessage: data.translatedMessage,
          originalLanguage: data.originalLanguage,
          translatedLanguage: data.translatedLanguage,
          timestamp: data.timestamp,
          isOwn: false,
        },
      ])
    }

    const ownTranslatedMessageHandler = (data: {
      message: string
      translatedMessage?: string
      originalLanguage?: string
      translatedLanguage?: string
      timestamp: number
    }) => {
      setMessages((prev) =>
        prev.map((msg, index) =>
          index === prev.length - 1 && msg.isOwn && msg.message === data.message
            ? {
                ...msg,
                translatedMessage: data.translatedMessage,
                originalLanguage: data.originalLanguage,
                translatedLanguage: data.translatedLanguage,
              }
            : msg,
        ),
      )
    }

    socket.on("receiveMessage", receiveMessageHandler)
    socket.on("ownTranslatedMessage", ownTranslatedMessageHandler)

    return () => {
      socket.off("receiveMessage", receiveMessageHandler)
      socket.off("ownTranslatedMessage", ownTranslatedMessageHandler)
    }
  }, [socket, roomID, language])

  const handleSend = () => {
    if (messageInput.trim()) {
      const newMessage: Message = {
        username,
        message: messageInput.trim(),
        timestamp: Date.now(),
        isOwn: true,
      }

      setMessages((prev) => [...prev, newMessage])

      socket.emit("sendMessage", {
        roomId: roomID,
        message: messageInput.trim(),
        username,
        language,
      })

      setMessageInput("")
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="bg-gray-900 p-4 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Button onClick={onLeave} variant="ghost" size="sm" className="text-white hover:bg-gray-800">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-xl font-bold text-white">1-1 Chat</h2>
              <p className="text-sm text-gray-300">Connected as {username}</p>
              <div className="flex gap-2 text-xs text-gray-400 mt-1">
                <span>
                  Your language: <span className="text-yellow-400">{language.toUpperCase()}</span>
                </span>
                {partnerLanguage && (
                  <span>
                    • Partner: <span className="text-blue-400">{partnerLanguage.toUpperCase()}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-500">Room: {typeof roomID === "string" ? roomID.slice(-8) : "Unknown"}</div>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              <p>Start chatting! Messages will appear here.</p>
            </div>
          )}
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.isOwn ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  msg.isOwn ? "bg-blue-600 text-white" : "bg-gray-800 text-white border border-gray-700"
                }`}
              >
                <p className="text-xs font-medium mb-1 opacity-75">{msg.isOwn ? "You" : msg.username}</p>
                <p>{msg.message}</p>
                {msg.translatedMessage && msg.translatedMessage !== msg.message && (
                  <div className="mt-2 pt-2 border-t border-gray-600">
                    <p className="text-xs text-yellow-400 mb-1">
                      Translation ({msg.originalLanguage} → {msg.translatedLanguage}):
                    </p>
                    <p className="italic text-gray-300">{msg.translatedMessage}</p>
                  </div>
                )}
                <p className="text-xs opacity-50 mt-1">{new Date(msg.timestamp).toLocaleTimeString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 bg-gray-900 border-t border-gray-700">
        <div className="flex gap-2">
          <Input
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-yellow-400"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend()
            }}
          />
          <Button onClick={handleSend} size="icon" className="bg-blue-600 hover:bg-blue-700 border-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
