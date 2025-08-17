"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LanguageSelector } from "./language-selector"
import { Copy, ArrowLeft, MessageCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ChatCreationFlowProps {
  onBack: () => void
  onChatCreated: (chatData: { code: string; language: string; username: string }) => void
}

export function ChatCreationFlow({ onBack, onChatCreated }: ChatCreationFlowProps) {
  const [step, setStep] = useState<"language" | "username" | "created">("language")
  const [selectedLanguage, setSelectedLanguage] = useState("")
  const [username, setUsername] = useState("")
  const [chatCode, setChatCode] = useState("")
  const { toast } = useToast()

  // Generate random alphanumeric code (5-6 characters)
  const generateChatCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    const length = Math.random() > 0.5 ? 5 : 6
    let result = ""
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  const handleLanguageNext = () => {
    if (!selectedLanguage) {
      toast({
        title: "Language Required",
        description: "Please select your preferred language to continue.",
        variant: "destructive",
      })
      return
    }
    setStep("username")
  }

  const handleUsernameNext = () => {
    if (!username.trim()) {
      toast({
        title: "Username Required",
        description: "Please enter a username to continue.",
        variant: "destructive",
      })
      return
    }
    if (username.length < 2) {
      toast({
        title: "Username Too Short",
        description: "Username must be at least 2 characters long.",
        variant: "destructive",
      })
      return
    }
    const code = generateChatCode()
    setChatCode(code)
    setStep("created")
  }

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(chatCode)
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

  const handleStartChat = () => {
    onChatCreated({
      code: chatCode,
      language: selectedLanguage,
      username: username.trim(),
    })
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Back button */}
        <Button variant="ghost" onClick={onBack} className="mb-6 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        {step === "language" && (
          <Card className="bg-card border-border">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-foreground font-[var(--font-heading)]">
                Create New Chat
              </CardTitle>
              <CardDescription className="text-muted-foreground font-[var(--font-sans)]">
                Select the language you'll be communicating in
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <LanguageSelector
                selectedLanguage={selectedLanguage}
                onLanguageChange={setSelectedLanguage}
                label="What language do you know?"
              />
              <Button
                onClick={handleLanguageNext}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-[var(--font-heading)]"
                size="lg"
              >
                Continue
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "username" && (
          <Card className="bg-card border-border">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-foreground font-[var(--font-heading)]">
                Choose Username
              </CardTitle>
              <CardDescription className="text-muted-foreground font-[var(--font-sans)]">
                This is how others will see you in the chat
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-foreground font-[var(--font-heading)]">
                  Enter your username
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Your display name..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-input border-border text-foreground"
                  maxLength={20}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleUsernameNext()
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">{username.length}/20 characters</p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep("language")}
                  className="flex-1 border-border text-foreground hover:bg-accent"
                >
                  Back
                </Button>
                <Button
                  onClick={handleUsernameNext}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-[var(--font-heading)]"
                >
                  Create Chat
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "created" && (
          <Card className="bg-card border-border">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-foreground font-[var(--font-heading)]">
                Chat Room Created!
              </CardTitle>
              <CardDescription className="text-muted-foreground font-[var(--font-sans)]">
                Share this code with others to join your chat
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-6 mb-4">
                  <p className="text-sm text-muted-foreground mb-2 font-[var(--font-sans)]">Chat Code</p>
                  <p className="text-4xl font-bold text-primary font-mono tracking-wider">{chatCode}</p>
                </div>
                <Button
                  onClick={handleCopyCode}
                  variant="outline"
                  className="mb-4 border-border text-foreground hover:bg-accent bg-transparent"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Code
                </Button>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-[var(--font-sans)]">Username:</span>
                  <span className="text-foreground font-semibold">{username}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-[var(--font-sans)]">Language:</span>
                  <span className="text-foreground font-semibold">{selectedLanguage.toUpperCase()}</span>
                </div>
              </div>

              <Button
                onClick={handleStartChat}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-[var(--font-heading)]"
                size="lg"
              >
                <MessageCircle className="mr-2 h-5 w-5" />
                Start Chatting
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
