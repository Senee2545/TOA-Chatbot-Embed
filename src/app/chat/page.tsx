'use client'

import { useState, useRef, useEffect } from 'react'
import { ResponseStream } from '../components/response-stream'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Message {
  text: string
  sender: 'user' | 'bot'
}

function linkify(text: string) {
  const urlRegex = /(https?:\/\/[^\s<>()]+)/g
  return text.replace(
    urlRegex,
    (url) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline hover:text-blue-800">${url}</a>`
  )
}

function TypewriterLink({
  text,
  speed = 20,
  className = "",
}: {
  text: string
  speed?: number
  className?: string
}) {
  const [i, setI] = useState(0)

  useEffect(() => {
    setI(0)
    const id = setInterval(() => {
      setI(prev => {
        if (prev >= text.length) {
          clearInterval(id)
          return prev
        }
        return prev + 1
      })
    }, speed)
    return () => clearInterval(id)
  }, [text, speed])

  const current = text.slice(0, i)

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: linkify(current) }}
    />
  )
}

export default function ChatPage(props: { email: string; id: string }) {
  const [messages, setMessages] = useState<Message[]>([
    //{ text: `สวัสดีครับ คุณ ${props.email}! ผมสามารถช่วยอะไรคุณได้บ้างครับ?`, sender: 'bot' }
  ])
  const [input, setInput] = useState('')
  const [showUserInfo, setShowUserInfo] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(false)

  // เพิ่ม state ใน component
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const router = useRouter()

  // เพิ่มฟังก์ชัน logout
  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error('Logout error:', error)
        alert('เกิดข้อผิดพลาดในการออกจากระบบ')
      } else {
        router.push('/')
      }
    } catch (error) {
      console.error('Logout error:', error)
      alert('เกิดข้อผิดพลาดในการออกจากระบบ')
    } finally {
      setIsLoggingOut(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isLoading) {
      const userMessage: Message = { text: input, sender: 'user' }
      setMessages(prev => [...prev, userMessage])

      const userInput = input
      setInput('')
      setIsLoading(true)

      try {
        const response = await fetch('/api/DOA-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: userInput }]
          }),
        })

        if (!response.ok) {
          throw new Error('Network response was not ok')
        }

        // รับ JSON response
        const data = await response.json()

        // เพิ่มข้อความบอทที่มี JSON format
        const botMessage: Message = {
          text: JSON.stringify(data.content), // ห่อด้วย JSON.stringify เพื่อให้ ResponseStream ใช้ JSON.parse() ได้
          sender: 'bot'
        }
        setMessages(prev => [...prev, botMessage])

      } catch (error) {
        console.error('Error:', error)
        setMessages(prev => [...prev, {
          text: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง 😔',
          sender: 'bot'
        }])
      } finally {
        setIsLoading(false)
      }
    }
  }

  // เรียก API /api/DOA-chat
  const greeted = useRef(false)
  useEffect(() => {
    if (greeted.current) return
    greeted.current = true

    ;(async () => {
      try {
        const res = await fetch('/api/DOA-chat', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ messages: [] }), 
        })
        if (!res.ok) return
        const data = await res.json()
        setMessages(prev => [...prev, 
          { text: JSON.stringify(data.content), sender: 'bot' }
        ])
      } catch (e) {
        console.error('greeting error', e)
      }
    })()
}, [])






  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col">
      {/* Header - Desktop */}
      <header className="hidden md:block bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Logo */}
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center">
                🤖
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">แชทบอท AI</h1>
                <p className="text-gray-600">ผู้ช่วยอัจฉริยะของคุณ</p>
              </div>
            </div>

            {/* User Info - Desktop */}
            <div className="flex items-center space-x-4">
              <nav className="flex items-center space-x-4">
                <Link href="/embed" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                  สร้างแชทบอท
                </Link>
                {/* <Link href="/" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                  หน้าแรก
                </Link> */}
              </nav>
              <div className="relative">
                <button
                  onClick={() => setShowUserInfo(!showUserInfo)}
                  className="flex items-center space-x-3 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 px-4 py-2 rounded-xl border border-gray-200 transition-all duration-200 group"
                >
                  <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {props.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900">{props.email}</div>
                    <div className="text-xs text-gray-500">ผู้ใช้งาน</div>
                  </div>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showUserInfo ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* User Info Dropdown - Desktop */}
                {showUserInfo && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 p-4 z-50">
                    <div className="text-center mb-4">
                      <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-3">
                        {props.email.charAt(0).toUpperCase()}
                      </div>
                      <h3 className="font-semibold text-gray-900">ข้อมูลผู้ใช้งาน</h3>
                    </div>

                    <div className="space-y-3">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-blue-600">📧</span>
                          <span className="text-sm font-medium text-gray-700">อีเมล</span>
                        </div>
                        <div className="text-sm text-gray-900 font-mono bg-white px-2 py-1 rounded border">
                          {props.email}
                        </div>
                      </div>

                      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-3 rounded-lg">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-purple-600">🪪</span>
                          <span className="text-sm font-medium text-gray-700">User ID</span>
                        </div>
                        <div className="text-xs text-gray-600 font-mono bg-white px-2 py-1 rounded border break-all">
                          {props.id}
                        </div>
                      </div>
                      <div className="pt-3 border-t border-gray-200">
                        <button
                          onClick={handleLogout}
                          disabled={isLoggingOut}
                          className="w-full bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg flex items-center justify-center space-x-2 font-medium"
                        >
                          {isLoggingOut ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>กำลังออกจากระบบ...</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                              </svg>
                              <span>ออกจากระบบ</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="md:hidden bg-white shadow-sm border-b">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-2 rounded-full text-lg">
                🤖
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">แชทบอท AI</h1>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-gray-500">ออนไลน์</span>
                </div>
              </div>
            </div>

            {/* User Avatar - Mobile */}
            <button
              onClick={() => setShowUserInfo(!showUserInfo)}
              className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm transition-transform duration-200 hover:scale-105"
            >
              {props.email.charAt(0).toUpperCase()}
            </button>
          </div>

          {/* User Info Dropdown - Mobile */}
          {showUserInfo && (
            <div className="mt-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
              <div className="text-center mb-3">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-2">
                  {props.email.charAt(0).toUpperCase()}
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">ข้อมูลผู้ใช้งาน</h3>
              </div>

              <div className="space-y-2">
                <div className="bg-white p-2 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-blue-600 text-sm">📧</span>
                    <span className="text-xs font-medium text-gray-700">อีเมล</span>
                  </div>
                  <div className="text-xs text-gray-900 font-mono">
                    {props.email}
                  </div>
                </div>

                <div className="bg-white p-2 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-purple-600 text-sm">🆔</span>
                    <span className="text-xs font-medium text-gray-700">User ID</span>
                  </div>
                  <div className="text-xs text-gray-600 font-mono break-all">
                    {props.id.length > 20 ? `${props.id.substring(0, 20)}...` : props.id}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 text-sm font-medium"
                  >
                    {isLoggingOut ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>กำลังออก...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>ออกจากระบบ</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Chat Area - Responsive */}
      {/* Main Chat Area - Responsive */}
      <main className="flex-1 flex flex-col md:max-w-4xl md:mx-auto md:px-4 md:py-8 w-full overflow-hidden">
        <div className="flex-1 flex flex-col bg-white md:rounded-xl md:shadow-lg border-0 md:border border-gray-200 overflow-hidden h-[calc(100vh-140px)] md:h-[70vh]">
          {/* Chat Header - Desktop Only */}
          <div className="hidden md:block bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-b shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center">
                🤖
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">แชทบอท AI</h2>
                <p className="text-sm text-gray-600">พร้อมให้บริการตลอด 24 ชั่วโมง</p>
              </div>
              <div className="ml-auto flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-500">ออนไลน์</span>
              </div>
            </div>
          </div>

          {/* Messages Area - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-gray-50 md:bg-white">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
              >
                <div className={`flex items-start max-w-[85%] md:max-w-xs lg:max-w-md ${msg.sender === 'user' ? 'flex-row-reverse gap-x-4' : 'gap-x-4'}`}>
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${msg.sender === 'user'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-sm'
                    : 'bg-gray-200 text-gray-600'
                    }`}>
                    {msg.sender === 'user' ? props.email.charAt(0).toUpperCase() : '🤖'}
                  </div>
                  <div
                    className={`px-3 md:px-4 py-2 md:py-3 rounded-lg transition-all duration-200 hover:shadow-md text-sm md:text-base ${msg.sender === 'user'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-br-none'
                      : 'bg-white md:bg-gray-100 text-gray-800 rounded-bl-none shadow-sm'
                      }`}
                  >
                    {/* ใช้ ResponseStream สำหรับข้อความบอท */}
                    {/* {msg.sender === 'bot' ? (
                      msg.text ? (
                        <ResponseStream
                          textStream={JSON.parse(msg.text)}
                          mode="typewriter"
                          speed={20}
                          as="div"
                          className="whitespace-pre-line"
                        />
                      ) : (
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      )
                    ) : (
                      // ข้อความผู้ใช้แสดงปกติ
                      msg.text
                    )} */}
                    {msg.sender === 'bot' ? (
                      msg.text ? (() => {
                        const parsed = JSON.parse(msg.text)

                        // ถ้าเป็น string → เช็คว่ามีลิงก์มั้ย
                        if (typeof parsed === 'string') {
                          // พิมพ์ทีละตัว + ลิงก์คลิกได้
                          return (
                            <TypewriterLink
                              text={parsed}
                              speed={20}
                              className="whitespace-pre-line"
                            />
                          )
                        }

                        // ถ้าไม่ใช่ string → ใช้ ResponseStream ปกติ
                        return (
                          <ResponseStream
                            textStream={parsed}
                            mode="typewriter"
                            speed={20}
                            as="div"
                            className="whitespace-pre-line"
                          />
                        )
                      })() : (
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      )
                    ) : (
                      msg.text
                    )}

                  </div>
                </div>
              </div>
            ))}

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-gray-50 md:bg-white">
              {/* messages */}
              <div ref={messagesEndRef} />
            </div>

          </div>

          {/* Input Area - Fixed */}
          <form onSubmit={handleSendMessage} className="shrink-0 p-4 md:p-6 border-t bg-white md:bg-gray-50">
            <div className="flex space-x-2 md:space-x-4">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="พิมพ์ข้อความ..."
                disabled={isLoading}
                className="flex-1 px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 md:px-6 py-2 md:py-3 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md text-sm md:text-base font-medium"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="hidden sm:inline">กำลังส่ง...</span>
                  </div>
                ) : (
                  <>
                    <span className="hidden sm:inline">ส่ง</span>
                    <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        /* Custom scrollbar for webkit browsers */
        .overflow-y-auto::-webkit-scrollbar {
          width: 4px;
        }
        .overflow-y-auto::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 2px;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  )
}