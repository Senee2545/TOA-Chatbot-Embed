/* eslint-disable @next/next/no-img-element */
'use client' 

import { useState, useRef, useEffect } from 'react'
import { ResponseStream } from '../components/response-stream'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface userProps {
  email?: string;
  id?: string;
}

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

export default function ChatPage(props: userProps) {
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

      // เพิ่มข้อความ "กำลังพิมพ์..." ของบอท
      const loadingMessage: Message = { text: '', sender: 'bot' }
      setMessages(prev => [...prev, loadingMessage])

      try {
        const response = await fetch('/api/DOA-chat3', {
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

        // แทนที่ข้อความ loading ด้วยข้อความจริงจากบอท
        setMessages(prev => {
          const newMessages = [...prev]
          newMessages[newMessages.length - 1] = {
            text: JSON.stringify(data.content),
            sender: 'bot'
          }
          return newMessages
        })

      } catch (error) {
        console.error('Error:', error)
        // แทนที่ข้อความ loading ด้วยข้อความ error
        setMessages(prev => {
          const newMessages = [...prev]
          newMessages[newMessages.length - 1] = {
            text: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง 😔',
            sender: 'bot'
          }
          return newMessages
        })
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
        // เพิ่มข้อความ loading ก่อน
        setMessages(prev => [...prev, { text: '', sender: 'bot' }])
        
        const res = await fetch('/api/DOA-chat3', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ messages: [] }), 
        })
        if (!res.ok) return
        const data = await res.json()
        
        // แทนที่ข้อความ loading ด้วยข้อความจริง
        setMessages(prev => {
          const newMessages = [...prev]
          if (newMessages.length > 0) {
            newMessages[newMessages.length - 1] = {
              text: JSON.stringify(data.content),
              sender: 'bot'
            }
          }
          return newMessages
        })
      } catch (e) {
        console.error('greeting error', e)
        // แทนที่ด้วยข้อความ error
        setMessages(prev => {
          const newMessages = [...prev]
          if (newMessages.length > 0) {
            newMessages[newMessages.length - 1] = {
              text: 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
              sender: 'bot'
            }
          }
          return newMessages
        })
      }
    })()
}, [])






  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header - Desktop */}
      <header className="hidden bg-white border-b shadow-sm md:block">
        <div className="px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Logo */}
              <div className="flex items-center justify-center w-10 h-10 text-white rounded-full bg-gradient-to-r from-blue-500 to-purple-600">
                <img
                  src="/images/logo.png"
                  alt="Bot Icon"
                  className="object-cover w-full h-full rounded-full"
                  onError={(e) => {
                    const target = e.currentTarget
                    target.style.display = 'none'
                    if (target.parentElement) {
                      target.parentElement.innerHTML = '<span class="flex items-center justify-center text-lg">🤖</span>'
                    }
                  }}
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">แชทบอท AI</h1>
                <p className="text-gray-600">ผู้ช่วยอัจฉริยะของคุณ</p>
              </div>
            </div>

            {/* User Info - Desktop */}
            <div className="flex items-center space-x-4">
              <nav className="flex items-center space-x-4">
                <Link href="/embed" className="px-3 py-2 text-gray-600 transition-colors rounded-lg hover:text-gray-900 hover:bg-gray-100">
                  สร้างแชทบอท
                </Link>
                {/* <Link href="/" className="px-3 py-2 text-gray-600 transition-colors rounded-lg hover:text-gray-900 hover:bg-gray-100">
                  หน้าแรก
                </Link> */}
              </nav>
              <div className="relative">
                <button
                  onClick={() => setShowUserInfo(!showUserInfo)}
                  className="flex items-center px-4 py-2 space-x-3 transition-all duration-200 border border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 rounded-xl group"
                >
                  <div className="flex items-center justify-center w-10 h-10 text-sm font-semibold text-white rounded-full bg-gradient-to-r from-indigo-500 to-purple-600">
                    {/* {props.email.charAt(0).toUpperCase()} */}
                    {props.email?.charAt(0)?.toUpperCase() ?? ""}
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
                  <div className="absolute right-0 z-50 p-4 mt-2 bg-white border border-gray-200 shadow-lg top-full w-80 rounded-xl">
                    <div className="mb-4 text-center">
                      <div className="flex items-center justify-center w-16 h-16 mx-auto mb-3 text-xl font-bold text-white rounded-full bg-gradient-to-r from-indigo-500 to-purple-600">
                        {/* {props.email.charAt(0).toUpperCase()} */}
                        {props.email?.charAt(0)?.toUpperCase() ?? ""}
                      </div>
                      <h3 className="font-semibold text-gray-900">ข้อมูลผู้ใช้งาน</h3>
                    </div>

                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50">
                        <div className="flex items-center mb-1 space-x-2">
                          <span className="text-blue-600">📧</span>
                          <span className="text-sm font-medium text-gray-700">อีเมล</span>
                        </div>
                        <div className="px-2 py-1 font-mono text-sm text-gray-900 bg-white border rounded">
                          {props.email}
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50">
                        <div className="flex items-center mb-1 space-x-2">
                          <span className="text-purple-600">🪪</span>
                          <span className="text-sm font-medium text-gray-700">User ID</span>
                        </div>
                        <div className="px-2 py-1 font-mono text-xs text-gray-600 break-all bg-white border rounded">
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
                              <div className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
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
      <header className="bg-white border-b shadow-sm md:hidden">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 text-lg text-white rounded-full bg-gradient-to-r from-blue-500 to-purple-600">
                <img
                  src="/images/logo.png"
                  alt="Bot Icon"
                  className="object-cover w-6 h-6 rounded-full"
                  onError={(e) => {
                    const target = e.currentTarget
                    target.style.display = 'none'
                    if (target.parentElement) {
                      target.parentElement.innerHTML = '🤖'
                    }
                  }}
                />
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
              className="flex items-center justify-center w-10 h-10 text-sm font-semibold text-white transition-transform duration-200 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:scale-105"
            >
              {/* {props.email.charAt(0).toUpperCase()} */}
              {props.email?.charAt(0)?.toUpperCase() ?? ""}
            </button>
          </div>

          {/* User Info Dropdown - Mobile */}
          {showUserInfo && (
            <div className="p-4 mt-4 border border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
              <div className="mb-3 text-center">
                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-2 text-lg font-bold text-white rounded-full bg-gradient-to-r from-indigo-500 to-purple-600">
                  {/* {props.email.charAt(0).toUpperCase()} */}
                  {props.email?.charAt(0)?.toUpperCase() ?? ""}
                </div>
                <h3 className="text-sm font-semibold text-gray-900">ข้อมูลผู้ใช้งาน</h3>
              </div>

              <div className="space-y-2">
                <div className="p-2 bg-white rounded-lg">
                  <div className="flex items-center mb-1 space-x-2">
                    <span className="text-sm text-blue-600">📧</span>
                    <span className="text-xs font-medium text-gray-700">อีเมล</span>
                  </div>
                  <div className="font-mono text-xs text-gray-900">
                    {props.email}
                  </div>
                </div>

                <div className="p-2 bg-white rounded-lg">
                  <div className="flex items-center mb-1 space-x-2">
                    <span className="text-sm text-purple-600">🆔</span>
                    <span className="text-xs font-medium text-gray-700">User ID</span>
                  </div>
                  <div className="font-mono text-xs text-gray-600 break-all">
                    {/* {props.id.length > 20 ? `${props.id.substring(0, 20)}...` : props.id} */}
                    {(props.id ?? "").length > 20
                      ? `${(props.id ?? "").substring(0, 20)}...`
                      : (props.id ?? "")
                    }
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="flex items-center justify-center w-full px-3 py-2 space-x-2 text-sm font-medium text-white transition-all duration-200 rounded-lg bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoggingOut ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
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
      <main className="flex flex-col flex-1 w-full overflow-hidden md:max-w-4xl md:mx-auto md:px-4 md:py-8">
        <div className="flex-1 flex flex-col bg-white md:rounded-xl md:shadow-lg border-0 md:border border-gray-200 overflow-hidden h-[calc(100vh-140px)] md:h-[70vh]">
          {/* Chat Header - Desktop Only */}
          <div className="hidden px-6 py-4 border-b md:block bg-gradient-to-r from-blue-50 to-purple-50 shrink-0">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 text-white rounded-full bg-gradient-to-r from-blue-500 to-purple-600">
                <img
                  src="/images/logo.png"
                  alt="Bot Icon"
                  className="object-cover w-full h-full rounded-full"
                  onError={(e) => {
                    const target = e.currentTarget
                    target.style.display = 'none'
                    if (target.parentElement) {
                      target.parentElement.innerHTML = '<span class="flex items-center justify-center text-lg">🤖</span>'
                    }
                  }}
                />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">แชทบอท AI</h2>
                <p className="text-sm text-gray-600">พร้อมให้บริการตลอด 24 ชั่วโมง</p>
              </div>
              <div className="flex items-center ml-auto space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-500">ออนไลน์</span>
              </div>
            </div>
          </div>

          {/* Messages Area - Scrollable */}
          <div className="flex-1 p-4 space-y-4 overflow-y-auto md:p-6 bg-gray-50 md:bg-white">
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
                    {msg.sender === 'user' ? (props.email?.charAt(0)?.toUpperCase() ?? '') : (
                      <img
                  src="/images/logo.png"
                  alt="Bot Icon"
                  className="object-cover w-full h-full rounded-full"
                  onError={(e) => {
                    const target = e.currentTarget
                    target.style.display = 'none'
                    if (target.parentElement) {
                      target.parentElement.innerHTML = '<span class="flex items-center justify-center text-lg">🤖</span>'
                    }
                  }}
                />
                    )}
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
                        // แสดง loading dots พร้อมข้อความ "กำลังพิมพ์..."
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span className="text-sm text-gray-500"></span>
                        </div>
                      )
                    ) : (
                      msg.text
                    )}

                  </div>
                </div>
              </div>
            ))}
            
            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area - Fixed */}
          <form onSubmit={handleSendMessage} className="p-4 bg-white border-t shrink-0 md:p-6 md:bg-gray-50">
            <div className="flex space-x-2 md:space-x-4">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="พิมพ์ข้อความ..."
                disabled={isLoading}
                className="flex-1 px-3 py-2 text-sm transition-all border border-gray-300 rounded-lg md:px-4 md:py-3 md:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="px-4 py-2 text-sm font-medium text-white transition-all duration-200 transform rounded-lg shadow-md bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed md:px-6 md:py-3 hover:scale-105 md:text-base"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
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