"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Send, Users, Copy, Download, Globe, Loader2, Heart, UserX } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { translationService } from "@/lib/translation-service"

interface Message {
  id: string
  username: string
  userLanguage: string
  detectedLanguage?: string
  originalText: string
  translations: Record<string, string>
  timestamp: Date
  isOwn: boolean
  isTranslating?: boolean
  reactions?: Record<string, string[]>
}

interface User {
  username: string
  language: string
  isTyping: boolean
  lastSeen: Date
}

interface ChatInterfaceProps {
  chatData: {
    code: string
    language: string
    username: string
    isOneOnOne?: boolean
  }
  onBack: () => void
}

interface RoomState {
  messages: Message[]
  users: User[]
}

export function ChatInterface({ chatData, onBack }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [isSending, setIsSending] = useState(false)
  const [broadcastChannel, setBroadcastChannel] = useState<BroadcastChannel | null>(null)
  const [partnerDisconnected, setPartnerDisconnected] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const userIdRef = useRef<string>("")

  useEffect(() => {
    userIdRef.current = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }, [])

  const getAllLanguages = () => {
    return [...new Set(users.map((user) => user.language))]
  }

  useEffect(() => {
    if (typeof window === "undefined") return

    const roomName = `chat_room_${chatData.code}`
    console.log("[v0] 🏠 Setting up chat room:", roomName)
    console.log("[v0] 🔑 Using chat code:", chatData.code)
    console.log("[v0] 👤 User:", chatData.username, "Language:", chatData.language)
    console.log("[v0] 🎯 Is 1v1 chat:", chatData.isOneOnOne)

    const channel = new BroadcastChannel(roomName)
    setBroadcastChannel(channel)

    channel.onmessage = (event) => {
      const { type, data } = event.data
      console.log("[v0] 📨 Received message in room", roomName, ":", type, data)

      switch (type) {
        case "USER_JOINED":
          console.log("[v0] 👋 User joined:", data.username, "Language:", data.language)
          setUsers((prev) => {
            const exists = prev.some((u) => u.username === data.username)
            if (exists) return prev
            const newUsers = [...prev, data]

            if (chatData.isOneOnOne && data.username !== chatData.username) {
              console.log("[v0] 💕 Partner connected in 1v1 chat!")
              toast({
                title: "Partner Connected!",
                description: `${data.username} joined the chat (${data.language.toUpperCase()})`,
              })
              setPartnerDisconnected(false)
            }

            setTimeout(() => {
              if (channel && !channel.closed) {
                channel.postMessage({
                  type: "USER_LIST_UPDATE",
                  data: { users: newUsers },
                })
              }
            }, 50)

            return newUsers
          })
          break

        case "USER_LIST_UPDATE":
          console.log(
            "[v0] 📋 User list updated:",
            data.users.map((u: User) => u.username),
          )
          setUsers((prev) => {
            const currentUser = prev.find((u) => u.username === chatData.username)
            const otherUsers = data.users.filter((u: User) => u.username !== chatData.username)
            return currentUser ? [currentUser, ...otherUsers] : data.users
          })
          break

        case "REQUEST_ROOM_STATE":
          console.log("[v0] 🔍 Room state requested by:", data.requesterId)
          if (channel && !channel.closed) {
            channel.postMessage({
              type: "ROOM_STATE_RESPONSE",
              data: {
                users: users,
                messages: messages,
                requesterId: data.requesterId,
              },
            })
          }
          break

        case "ROOM_STATE_RESPONSE":
          if (data.requesterId === userIdRef.current) {
            console.log(
              "[v0] 📦 Received room state:",
              data.users.length,
              "users,",
              data.messages?.length || 0,
              "messages",
            )
            setUsers((prev) => {
              const currentUser = {
                username: chatData.username,
                language: chatData.language,
                isTyping: false,
                lastSeen: new Date(),
              }
              const existingUsers = data.users.filter((u: User) => u.username !== chatData.username)
              return [currentUser, ...existingUsers]
            })

            if (data.messages && data.messages.length > 0) {
              setMessages(
                data.messages.map((msg: any) => ({
                  ...msg,
                  timestamp: new Date(msg.timestamp),
                  isOwn: msg.username === chatData.username,
                })),
              )
            }
          }
          break

        case "USER_LEFT":
          console.log("[v0] 👋 User left:", data.username)
          setUsers((prev) => {
            const leavingUser = prev.find((u) => u.username === data.username)

            if (chatData.isOneOnOne && leavingUser && leavingUser.username !== chatData.username) {
              console.log("[v0] 💔 Partner disconnected from 1v1 chat")
              setPartnerDisconnected(true)
              toast({
                title: "Partner Disconnected",
                description: `${leavingUser.username} left the chat`,
                variant: "destructive",
              })
            }

            return prev.filter((u) => u.username !== data.username)
          })
          break

        case "NEW_MESSAGE":
          console.log("[v0] 💬 New message received from:", data.username, "Message:", data.originalText)
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === data.id)
            if (exists) return prev
            return [...prev, { ...data, timestamp: new Date(data.timestamp) }]
          })
          break

        case "MESSAGE_TRANSLATED":
          console.log("[v0] 🌐 Translation received for message:", data.messageId)
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === data.messageId
                ? {
                    ...msg,
                    translations: data.translations,
                    detectedLanguage: data.detectedLanguage,
                    isTranslating: false,
                  }
                : msg,
            ),
          )
          break

        case "MESSAGE_REACTION":
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id === data.messageId) {
                const reactions = { ...msg.reactions } || {}
                const emoji = data.emoji
                const username = data.username

                if (!reactions[emoji]) {
                  reactions[emoji] = []
                }

                if (data.action === "add") {
                  if (!reactions[emoji].includes(username)) {
                    reactions[emoji] = [...reactions[emoji], username]
                  }
                } else if (data.action === "remove") {
                  reactions[emoji] = reactions[emoji].filter((u) => u !== username)
                  if (reactions[emoji].length === 0) {
                    delete reactions[emoji]
                  }
                }

                return { ...msg, reactions }
              }
              return msg
            }),
          )
          break

        case "USER_TYPING":
          if (data.username !== chatData.username) {
            setTypingUsers((prev) => {
              if (data.isTyping && !prev.includes(data.username)) {
                return [...prev, data.username]
              } else if (!data.isTyping) {
                return prev.filter((u) => u !== data.username)
              }
              return prev
            })
          }
          break
      }
    }

    const currentUser: User = {
      username: chatData.username,
      language: chatData.language,
      isTyping: false,
      lastSeen: new Date(),
    }

    setUsers([currentUser])

    console.log("[v0] 🔍 Requesting room state...")
    channel.postMessage({
      type: "REQUEST_ROOM_STATE",
      data: { requesterId: userIdRef.current },
    })

    setTimeout(() => {
      console.log("[v0] 👋 Broadcasting user joined...")
      channel.postMessage({
        type: "USER_JOINED",
        data: currentUser,
      })
    }, 200)

    return () => {
      console.log("[v0] 🧹 Cleaning up chat room:", roomName)
      try {
        if (channel && !channel.closed) {
          channel.postMessage({
            type: "USER_LEFT",
            data: { username: chatData.username },
          })
        }
      } catch (error) {
        console.log("[v0] Channel already closed during cleanup")
      }

      try {
        channel.close()
      } catch (error) {
        console.log("[v0] Error closing channel:", error)
      }

      setBroadcastChannel(null)
    }
  }, [chatData])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (!broadcastChannel || broadcastChannel.closed) return

    if (newMessage.trim()) {
      setIsTyping(true)
      try {
        if (broadcastChannel && !broadcastChannel.closed) {
          broadcastChannel.postMessage({
            type: "USER_TYPING",
            data: { username: chatData.username, isTyping: true },
          })
        }
      } catch (error) {
        console.log("[v0] Failed to send typing message:", error)
      }

      const timer = setTimeout(() => {
        setIsTyping(false)
        try {
          if (broadcastChannel && !broadcastChannel.closed) {
            broadcastChannel.postMessage({
              type: "USER_TYPING",
              data: { username: chatData.username, isTyping: false },
            })
          }
        } catch (error) {
          console.log("[v0] Failed to send stop typing message:", error)
        }
      }, 1000)
      return () => clearTimeout(timer)
    } else {
      setIsTyping(false)
      try {
        if (broadcastChannel && !broadcastChannel.closed) {
          broadcastChannel.postMessage({
            type: "USER_TYPING",
            data: { username: chatData.username, isTyping: false },
          })
        }
      } catch (error) {
        console.log("[v0] Failed to send stop typing message:", error)
      }
    }
  }, [newMessage, broadcastChannel, chatData.username])

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending || !broadcastChannel || broadcastChannel.closed) return

    setIsSending(true)
    const messageText = newMessage.trim()
    setNewMessage("")

    const messageId = `msg_${Date.now()}_${userIdRef.current}`

    console.log("[v0] 📤 Sending message:", messageText)
    console.log("[v0] 🆔 Message ID:", messageId)
    console.log("[v0] 🏠 Broadcasting to room:", `chat_room_${chatData.code}`)

    const message: Message = {
      id: messageId,
      username: chatData.username,
      userLanguage: chatData.language,
      originalText: messageText,
      translations: {},
      timestamp: new Date(),
      isOwn: true,
      isTranslating: true,
    }

    setMessages((prev) => [...prev, message])

    try {
      if (broadcastChannel && !broadcastChannel.closed) {
        console.log("[v0] 📡 Broadcasting NEW_MESSAGE...")
        broadcastChannel.postMessage({
          type: "NEW_MESSAGE",
          data: { ...message, isOwn: false, timestamp: message.timestamp.toISOString() },
        })
      }
    } catch (error) {
      console.log("[v0] Failed to broadcast new message:", error)
    }

    try {
      const allLanguages = [...new Set(users.map((user) => user.language))]
      console.log("[v0] 🌐 Translating for languages:", allLanguages)

      const { translations, detectedLanguage } = await translationService.translateForMultipleUsersWithDetection(
        messageText,
        chatData.language,
        allLanguages,
      )

      console.log("[v0] ✅ Translation complete. Detected language:", detectedLanguage)
      console.log("[v0] 📝 Translations:", translations)

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === message.id ? { ...msg, translations, detectedLanguage, isTranslating: false } : msg,
        ),
      )

      try {
        if (broadcastChannel && !broadcastChannel.closed) {
          console.log("[v0] 📡 Broadcasting MESSAGE_TRANSLATED...")
          broadcastChannel.postMessage({
            type: "MESSAGE_TRANSLATED",
            data: { messageId: message.id, translations, detectedLanguage },
          })
        }
      } catch (error) {
        console.log("[v0] Failed to broadcast translation:", error)
      }
    } catch (error) {
      console.error("Failed to translate message:", error)
      toast({
        title: "Translation Failed",
        description: "Could not translate your message. Please try again.",
        variant: "destructive",
      })

      setMessages((prev) => prev.map((msg) => (msg.id === message.id ? { ...msg, isTranslating: false } : msg)))
    } finally {
      setIsSending(false)
    }
  }

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(chatData.code)
      toast({
        title: "Code Copied!",
        description: "Chat code has been copied to your clipboard.",
      })
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Could not copy code. Please copy it manually.",
        variant: "destructive",
      })
    }
  }

  const handleDownloadTranscript = () => {
    const now = new Date()
    const chatDuration =
      messages.length > 0 ? Math.round((now.getTime() - messages[0].timestamp.getTime()) / (1000 * 60)) : 0

    const transcript = [
      "=".repeat(60),
      "GLOBALCHAT CONVERSATION TRANSCRIPT",
      "=".repeat(60),
      "",
      `Chat Room Code: ${chatData.code}`,
      `Generated: ${now.toLocaleString()}`,
      `Duration: ${chatDuration} minutes`,
      `Total Messages: ${messages.length}`,
      "",
      "PARTICIPANTS:",
      "-".repeat(20),
      ...users.map(
        (user) =>
          `• ${user.username} (${user.language.toUpperCase()}) ${user.username === chatData.username ? "(You)" : ""}`,
      ),
      "",
      "CONVERSATION:",
      "-".repeat(20),
      "",
      ...messages.map((msg, index) => {
        const viewerTranslation = msg.translations[chatData.language]
        const showTranslation = msg.isOwn
          ? viewerTranslation && viewerTranslation.trim() !== ""
          : viewerTranslation && viewerTranslation !== msg.originalText

        const languageInfo =
          msg.detectedLanguage && msg.detectedLanguage !== msg.userLanguage
            ? ` [Detected: ${msg.detectedLanguage.toUpperCase()}]`
            : ""

        return [
          `[${msg.timestamp.toLocaleString()}] ${msg.username} (${msg.userLanguage.toUpperCase()}${languageInfo}):`,
          `${msg.originalText}`,
          showTranslation ? `📝 Translation (${chatData.language.toUpperCase()}): ${viewerTranslation}` : "",
          index < messages.length - 1 ? "" : "",
        ]
          .filter((line) => line !== "")
          .join("\n")
      }),
      "",
      "=".repeat(60),
      "End of transcript",
      `Generated by GlobalChat - Connect Across Languages`,
      "=".repeat(60),
    ].join("\n")

    const blob = new Blob([transcript], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `globalchat-${chatData.code}-${now.toISOString().split("T")[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Transcript Downloaded",
      description: `Chat transcript saved with ${messages.length} messages and translations.`,
    })
  }

  const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢"]

  const handleReaction = (messageId: string, emoji: string) => {
    if (!broadcastChannel || broadcastChannel.closed) return

    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId) {
          const reactions = { ...msg.reactions } || {}
          const currentUserReacted = reactions[emoji]?.includes(chatData.username) || false

          if (!reactions[emoji]) {
            reactions[emoji] = []
          }

          let action = "add"
          if (currentUserReacted) {
            reactions[emoji] = reactions[emoji].filter((u) => u !== chatData.username)
            if (reactions[emoji].length === 0) {
              delete reactions[emoji]
            }
            action = "remove"
          } else {
            reactions[emoji] = [...reactions[emoji], chatData.username]
          }

          try {
            if (broadcastChannel && !broadcastChannel.closed) {
              broadcastChannel.postMessage({
                type: "MESSAGE_REACTION",
                data: {
                  messageId,
                  emoji,
                  username: chatData.username,
                  action,
                },
              })
            }
          } catch (error) {
            console.log("[v0] Failed to broadcast reaction:", error)
          }

          return { ...msg, reactions }
        }
        return msg
      }),
    )
  }

  const handleFindNewPartner = () => {
    try {
      if (broadcastChannel && !broadcastChannel.closed) {
        broadcastChannel.postMessage({
          type: "USER_LEFT",
          data: { username: chatData.username },
        })
      }
    } catch (error) {
      console.log("[v0] Failed to broadcast user left:", error)
    }
    onBack()
  }

  const getPartner = () => {
    if (!chatData.isOneOnOne) return null
    return users.find((u) => u.username !== chatData.username) || null
  }

  const partner = getPartner()

  return (
    <div className="h-screen bg-background flex flex-col">
      <div className="bg-card border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
              {chatData.isOneOnOne ? (
                <Heart className="w-5 h-5 text-accent" />
              ) : (
                <Globe className="w-5 h-5 text-primary" />
              )}
            </div>
            <div>
              {chatData.isOneOnOne ? (
                <>
                  <h2 className="font-semibold text-foreground font-[var(--font-heading)]">
                    {partner ? `Connected with ${partner.username}` : "1-1 Chat"}
                  </h2>
                  <p className="text-sm text-muted-foreground font-[var(--font-sans)]">
                    {partner ? (
                      <>
                        {partner.language.toUpperCase()} ↔ {chatData.language.toUpperCase()}
                        {partnerDisconnected && <span className="text-destructive ml-2">• Partner disconnected</span>}
                      </>
                    ) : (
                      "Waiting for partner..."
                    )}
                  </p>
                </>
              ) : (
                <>
                  <h2 className="font-semibold text-foreground font-[var(--font-heading)]">Chat Room</h2>
                  <p className="text-sm text-muted-foreground font-[var(--font-sans)]">
                    Code: {chatData.code} • {users.length} member{users.length !== 1 ? "s" : ""}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {chatData.isOneOnOne ? (
            <>
              {partnerDisconnected && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleFindNewPartner}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground"
                  title="Find New Partner"
                >
                  <Heart className="h-4 w-4 mr-2" />
                  Find New Partner
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleDownloadTranscript} title="Download Transcript">
                <Download className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={handleCopyCode} title="Copy Chat Code">
                <Copy className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDownloadTranscript} title="Download Transcript">
                <Download className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>
      </div>

      {!chatData.isOneOnOne && (
        <div className="bg-card/50 border-b border-border p-3">
          <div className="flex items-center space-x-2 overflow-x-auto">
            <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            {users.map((user, index) => (
              <Badge
                key={index}
                variant={user.username === chatData.username ? "default" : "secondary"}
                className="flex-shrink-0 font-[var(--font-sans)]"
              >
                {user.username} ({user.language.toUpperCase()}){user.username === chatData.username && " (You)"}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex justify-center items-center h-full">
            <div className="text-center text-muted-foreground">
              {chatData.isOneOnOne ? (
                <>
                  <Heart className="w-12 h-12 mx-auto mb-4 opacity-50 text-accent" />
                  <h3 className="text-lg font-semibold mb-2 font-[var(--font-heading)]">
                    {partner ? `Connected with ${partner.username}!` : "Waiting for your chat partner..."}
                  </h3>
                  {partner ? (
                    <>
                      <p className="text-sm font-[var(--font-sans)]">
                        You both speak different languages, but that's the magic!
                      </p>
                      <p className="text-xs mt-2 font-[var(--font-sans)]">
                        Your messages will be automatically translated for each other.
                      </p>
                      <p className="text-xs mt-1 text-accent font-[var(--font-sans)]">
                        💬 Start typing to begin your multilingual conversation!
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-[var(--font-sans)]">Looking for someone to chat with...</p>
                      <p className="text-xs mt-2 text-accent font-[var(--font-sans)]">
                        🌍 You'll be connected with someone who speaks a different language!
                      </p>
                    </>
                  )}
                </>
              ) : (
                <>
                  <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2 font-[var(--font-heading)]">Welcome to your chat room!</h3>
                  <p className="text-sm font-[var(--font-sans)]">
                    Share the code <strong>{chatData.code}</strong> with others to start chatting.
                  </p>
                  <p className="text-xs mt-2 font-[var(--font-sans)]">
                    Messages will be automatically translated for everyone.
                  </p>
                  <p className="text-xs mt-1 text-primary font-[var(--font-sans)]">
                    💡 Open another tab and join with the same code to test!
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {chatData.isOneOnOne && partnerDisconnected && messages.length > 0 && (
          <div className="flex justify-center">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center space-x-2 text-destructive">
                <UserX className="w-4 h-4" />
                <span className="text-sm font-medium">Your partner has disconnected</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleFindNewPartner}
                className="mt-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground bg-transparent"
              >
                <Heart className="w-4 h-4 mr-2" />
                Find New Partner
              </Button>
            </div>
          </div>
        )}

        {messages.map((message) => {
          let viewerTranslation = ""
          let showTranslation = false

          if (message.isOwn) {
            const otherUsers = users.filter((u) => u.username !== chatData.username)
            if (otherUsers.length === 1) {
              viewerTranslation = message.translations[otherUsers[0].language]
              showTranslation =
                viewerTranslation && viewerTranslation.trim() !== "" && viewerTranslation !== message.originalText
            } else if (otherUsers.length > 1) {
              const commonLanguage =
                otherUsers.find((u) => u.language === "english")?.language || otherUsers[0].language
              viewerTranslation = message.translations[commonLanguage]
              showTranslation =
                viewerTranslation && viewerTranslation.trim() !== "" && viewerTranslation !== message.originalText
            }
          } else {
            viewerTranslation = message.translations[chatData.language]
            showTranslation = viewerTranslation && viewerTranslation !== message.originalText
          }

          return (
            <div key={message.id} className={`flex ${message.isOwn ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[70%] ${message.isOwn ? "order-2" : "order-1"}`}>
                <div
                  className={`rounded-lg p-3 group relative ${
                    message.isOwn
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border text-card-foreground"
                  }`}
                >
                  {!message.isOwn && (
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-xs font-semibold text-accent font-[var(--font-heading)]">
                        {message.username}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {message.userLanguage.toUpperCase()}
                      </Badge>
                      {message.detectedLanguage && message.detectedLanguage !== message.userLanguage && (
                        <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 border-amber-200">
                          Detected: {message.detectedLanguage.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-sm font-[var(--font-sans)]">{message.originalText}</p>

                    {message.isTranslating && (
                      <div
                        className={`text-xs p-2 rounded flex items-center space-x-2 ${
                          message.isOwn
                            ? "bg-primary-foreground/20 text-primary-foreground/80"
                            : "bg-muted/50 text-muted-foreground"
                        }`}
                      >
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Detecting language & translating...</span>
                      </div>
                    )}

                    {!message.isTranslating && showTranslation && (
                      <div
                        className={`text-xs p-2 rounded ${
                          message.isOwn
                            ? "bg-primary-foreground/20 text-primary-foreground/80"
                            : "bg-muted/50 text-muted-foreground"
                        }`}
                      >
                        <span className="font-semibold">
                          📝{" "}
                          {message.isOwn
                            ? users.filter((u) => u.username !== chatData.username)[0]?.language.toUpperCase() ||
                              "TRANSLATED"
                            : chatData.language.toUpperCase()}
                          :
                        </span>
                        {viewerTranslation}
                      </div>
                    )}
                  </div>

                  <p
                    className={`text-xs mt-2 ${message.isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                  >
                    {message.timestamp.toLocaleTimeString()}
                    {message.isOwn && message.detectedLanguage && message.detectedLanguage !== message.userLanguage && (
                      <span className="ml-2 text-amber-300">• Detected: {message.detectedLanguage.toUpperCase()}</span>
                    )}
                  </p>

                  <div className="absolute -top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="bg-popover border border-border rounded-full px-2 py-1 flex space-x-1 shadow-lg">
                      {REACTION_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(message.id, emoji)}
                          className="hover:scale-125 transition-transform duration-150 text-sm"
                          title={`React with ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {message.reactions && Object.keys(message.reactions).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2 ml-2">
                    {Object.entries(message.reactions).map(([emoji, users]) => (
                      <button
                        key={emoji}
                        onClick={() => handleReaction(message.id, emoji)}
                        className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs border transition-colors ${
                          users.includes(chatData.username)
                            ? "bg-primary/20 border-primary text-primary"
                            : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
                        }`}
                        title={`${users.join(", ")} reacted with ${emoji}`}
                      >
                        <span>{emoji}</span>
                        <span className="font-medium">{users.length}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        <div ref={messagesEndRef} />
      </div>

      <div className="bg-card border-t border-border p-4">
        <div className="flex items-center space-x-3">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={chatData.isOneOnOne && !partner ? "Waiting for partner..." : "Type your message..."}
            className="flex-1 bg-input border-border text-foreground font-[var(--font-sans)]"
            disabled={isSending || (chatData.isOneOnOne && (!partner || partnerDisconnected))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isSending || (chatData.isOneOnOne && (!partner || partnerDisconnected))}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>

        {isTyping && <p className="text-xs text-muted-foreground mt-2 font-[var(--font-sans)]">You are typing...</p>}
      </div>
    </div>
  )
}
