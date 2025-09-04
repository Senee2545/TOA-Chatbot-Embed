/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { useState, useEffect,useRef } from 'react'
import { ResponseStream } from '../components/response-stream'

interface Message {
  text: string
  sender: 'user' | 'bot'
  isCompleted?: boolean // ใช้สำหรับบอกว่าเป็นข้อความที่สมบูรณ์แล้วหรือไม่
}

interface ChatSettings {
  width: string
  height: string
  bgColor: string
  textColor: string
  buttonColor: string
  borderRadius: string
  position: string
  dataSource: string
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

export default function ChatWidget(props: { email: string; id: string }) {
  const [sessionId, setSessionId] = useState<string>('');
  const [showMenu, setShowMenu] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
      //{ text: `สวัสดีครับ คุณ ${props.email}! ผมสามารถช่วยอะไรคุณได้บ้างครับ?`, sender: 'bot' }
    ])
  const [input, setInput] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false) // เพิ่ม loading state
  const [settings, setSettings] = useState<ChatSettings>({
    width: '350px',
    height: '500px',
    bgColor: '#ffffff',
    textColor: '#000000',
    buttonColor: '#007bff',
    borderRadius: '12px',
    position: 'center',
    dataSource: ''
  })


  // โหลด sessionId จาก localStorage เมื่อเริ่มต้น
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSessionId = localStorage.getItem('doa_chat_session_id');
      if (savedSessionId) {
        setSessionId(savedSessionId);
        console.log('Loaded sessionId from localStorage:', savedSessionId);
      }
    }
  }, []);

useEffect(() => {
    //console.log('📋 Current embed settings:', settings)
}, [settings])

useEffect(() => {
    //console.log('🟢 useEffect triggered - reading URL parameters')
    
    const params = new URLSearchParams(window.location.search)
    
    //console.log('🔗 Full URL:', window.location.href)
    //console.log('🔗 Search params:', window.location.search)
    //console.log('🔗 DataSource param:', params.get('dataSource'))
    
    const newSettings = {
      width: params.get('width') || '350px',
      height: params.get('height') || '500px',
      bgColor: params.get('bgColor') || '#ffffff',
      textColor: params.get('textColor') || '#000000',
      buttonColor: params.get('buttonColor') || '#007bff',
      borderRadius: params.get('borderRadius') || '12px',
      position: params.get('position') || 'center',
      dataSource: params.get('dataSource') || ''
    }
    
    //console.log('🎯 New settings to set:', newSettings)
    //console.log('🎯 Previous settings:', settings)
    
    setSettings(newSettings)
    
    //console.log('🎯 Settings updated to:', newSettings)

    if (params.get('position') === 'bottom-right') {
      document.body.style.background = 'transparent'
      document.documentElement.style.background = 'transparent'
    }

    if (params.get('position') === 'center') {
      setIsOpen(true)
    }
  }, []) // empty dependency array

// เพิ่ม useEffect เพื่อ track การเปลี่ยนแปลงของ settings
useEffect(() => {
    //console.log('🔄 Settings changed:', settings)
}, [settings])



//  ด้านบนภายใน component ChatWidget (คู่กับ useState/useEffect อื่น ๆ)
const greetedKeyRef = useRef<string | null>(null)

// helper: push ข้อความบอท + mark complete
const pushBotMessage = (content: string, apiResponse?: any) => {
  // ยังพิมพ์อยู่ → ให้ TypewriterLink ทำงาน
  setMessages(prev => [...prev, { text: JSON.stringify(content), sender: 'bot', isCompleted: false }])
  // mark เสร็จทีหลังเพื่อหยุด typewriter (ปรับเวลาได้)


    // 🆕 เช็ค sessionUpdated
  if (apiResponse?.sessionUpdated && apiResponse?.sessionId) {
    setSessionId(apiResponse.sessionId)
    localStorage.setItem('doa_chat_session_id', apiResponse.sessionId)
    console.log('🔄 Updated sessionId:', apiResponse.sessionId)
  }

  setTimeout(() => {
    setMessages(prev => {
      const next = [...prev]
      const lastBot = next.findLastIndex(m => m.sender === 'bot')
      if (lastBot !== -1) next[lastBot] = { ...next[lastBot], isCompleted: true }
      return next
    })
  }, 4000)
}

// Greeting สำหรับ Preview Mode (center) — ยิงครั้งแรกเมื่อ mount หรือ dataSource เปลี่ยน
useEffect(() => {
  if (settings.position !== 'center') return
  const key = `center|${settings.dataSource}`
  if (greetedKeyRef.current === key) return

  ;(async () => {
    try {
      const api = `/api/${settings.dataSource}`
      const res = await fetch(api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [], sessionId: sessionId}), // ← สำคัญ: ให้ API ส่ง greeting
      })
      if (!res.ok) return
      const data = await res.json()
      pushBotMessage(data.content)
      greetedKeyRef.current = key
    } catch (e) {
      console.error('greeting (center) error:', e)
    }
  })()
}, [settings.position, settings.dataSource, sessionId])

// Greeting สำหรับ Embed Mode (bottom-right) — ยิงเมื่อเปิดวิซเจ็ตครั้งแรก/เปลี่ยน dataSource
useEffect(() => {
  if (settings.position !== 'bottom-right') return
  if (!isOpen) return
  const key = `embed|${settings.dataSource}`
  if (greetedKeyRef.current === key) return

  ;(async () => {
    try {
      const api = `/api/${settings.dataSource}`
      const res = await fetch(api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [], sessionId: sessionId }),
      })
      if (!res.ok) return
      const data = await res.json()
      pushBotMessage(data.content)
      greetedKeyRef.current = key
    } catch (e) {
      console.error('greeting (embed) error:', e)
    }
  })()
}, [isOpen, settings.position, settings.dataSource, sessionId])




const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isLoading) {
      //console.log('📤 Sending message...')
      //console.log('🎯 Current settings state:', settings)
      //console.log('🎯 DataSource from state:', settings.dataSource)
      
      // อ่าน URL อีกครั้งเพื่อความแน่ใจ
      const params = new URLSearchParams(window.location.search)
      const urlDataSource = params.get('dataSource') || ''
      
      //console.log('🔗 DataSource from URL (fresh read):', urlDataSource)
      //console.log('⚖️ Comparison - State vs URL:', settings.dataSource, 'vs', urlDataSource)
      
      const userMessage: Message = { text: input, sender: 'user', isCompleted: true }
      setMessages(prev => [...prev, userMessage])
      
      const userInput = input
      setInput('')
      setIsLoading(true)
      
      try {
        // ใช้ dataSource จาก URL เพื่อความแน่ใจ
        const apiEndpoint = `/api/${urlDataSource}`
        
        //console.log('🔥 API endpoint to call:', apiEndpoint)
        
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: userInput }],
            sessionId: sessionId || undefined
          }),
        })

        //console.log('📡 API response status:', response.status)

        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.status}`)
        }

        // รับ JSON response
        const data = await response.json()
        //console.log('📥 API response data:', data)

        // เช็ค sessionUpdated
        if (data.sessionUpdated && data.sessionId) {
          setSessionId(data.sessionId)
          localStorage.setItem('doa_chat_session_id', data.sessionId)
          console.log('Updated sessionId from chat:', data.sessionId)
        }
        
        // เพิ่มข้อความบอทแบบยังไม่เสร็จ (จะมี typewriter animation)
        const botMessage: Message = { 
          text: JSON.stringify(data.content),
          sender: 'bot',
          isCompleted: false
        }
        setMessages(prev => [...prev, botMessage])

        // หลังจาก animation เสร็จ (3-5 วินาที) ค่อย mark เป็นเสร็จ
        setTimeout(() => {
          setMessages(prev => {
            const newMessages = [...prev]
            const lastBotIndex = newMessages.findLastIndex(msg => msg.sender === 'bot')
            if (lastBotIndex !== -1) {
              newMessages[lastBotIndex] = {
                ...newMessages[lastBotIndex],
                isCompleted: true
              }
            }
            return newMessages
          })
        }, 4000)
        
      } catch (error) {
        console.error('❌ API Error:', error)
        setMessages(prev => [...prev, { 
          text: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง 😔', 
          sender: 'bot',
          isCompleted: true
        }])
      } finally {
        setIsLoading(false)
      }
    }
  }
// แก้ในส่วนการแสดงผล Messages (ทั้ง Preview และ Embed Mode)
const renderMessage = (msg: Message) => {
  if (msg.sender === 'bot') {
    if (msg.text) {
      // ถ้าข้อความเสร็จแล้ว แสดงปกติ
      if (msg.isCompleted) {
        const parsed = JSON.parse(msg.text)
        
        // ถ้าเป็น string แสดงพร้อม linkify
        if (typeof parsed === 'string') {
          return (
            <div 
              className="whitespace-pre-line"
              dangerouslySetInnerHTML={{ __html: linkify(parsed) }}
            />
          )
        }
        
        // ถ้าไม่ใช่ string → แสดงตามปกติ
        return (
          <div className="whitespace-pre-line">
            {JSON.stringify(parsed)}
          </div>
        )
      } else {
        // ถ้ายังไม่เสร็จ ใช้ typewriter effect
        const parsed = JSON.parse(msg.text)
        
        // ถ้าเป็น string → ใช้ TypewriterLink
        if (typeof parsed === 'string') {
          return (
            <TypewriterLink
              text={parsed}
              speed={20}
              className="whitespace-pre-line"
            />
          )
        }
        
        // ถ้าไม่ใช่ string → ใช้ ResponseStream
        return (
          <ResponseStream
            textStream={parsed}
            mode="typewriter"
            speed={20}
            as="div"
            className="whitespace-pre-line"
          />
        )
      }
    } else {
      return (
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      )
    }
  } else {
    // ข้อความผู้ใช้แสดงปกติ
    return msg.text
  }
}


  // สำหรับ Preview Mode (center)
  if (settings.position === 'center') {
    return (
      <div 
        style={{
          width: settings.width,
          height: settings.height,
          backgroundColor: settings.bgColor,
          borderRadius: settings.borderRadius,
          boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          overflow: 'hidden',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between p-4"
          style={{ 
            backgroundColor: settings.buttonColor,
            color: '#ffffff'
          }}
        >
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              🤖
            </div>
            <div>
              <div className="font-medium text-sm">แชทบอท</div>
              <div className="text-xs opacity-80">
                {isLoading ? 'กำลังพิมพ์...' : 'ออนไลน์'}
                </div>
            </div>
          </div>
          
          <button
    onClick={() => setIsOpen(false)}
    className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:bg-white hover:bg-opacity-20"
    style={{ 
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      color: '#ffffff'
    }}
  >
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  </button>
        </div>

        {/* Messages */}
        <div 
          className="flex-1 overflow-y-auto p-4 space-y-3"
          style={{ 
            backgroundColor: settings.bgColor 
          }}
        >
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className="max-w-[80%] px-3 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: msg.sender === 'user' 
                    ? settings.buttonColor 
                    : '#f1f3f4',
                  color: msg.sender === 'user' ? '#ffffff' : settings.textColor
                }}
              >
                {renderMessage(msg)}
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <form onSubmit={handleSendMessage} className="p-4 border-t">
          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="พิมพ์ข้อความ..."
               disabled={isLoading}
              className="flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none transition-all"
              style={{ 
                borderColor: '#e1e5e9'
              } as React.CSSProperties}
              onFocus={(e) => {
                e.target.style.boxShadow = `0 0 0 1px ${settings.buttonColor}`
                e.target.style.borderColor = settings.buttonColor
              }}
              onBlur={(e) => {
                e.target.style.boxShadow = 'none'
                e.target.style.borderColor = '#e1e5e9'
              }}
            />
            <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="px-3 py-2 text-white rounded-lg transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: settings.buttonColor }}
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
          </div>
        </form>
      </div>
    )
  }

  // สำหรับ Embed Mode (bottom-right)
  // ในส่วน Embed Mode (bottom-right) แก้เป็น:

return (
  <div style={{ background: 'transparent' }}>
    {/* Chat Widget - แสดงเมื่อเปิด */}
    {isOpen && (
      <div
        style={{
          position: 'fixed',
          bottom: '100px', // เว้นระยะจากปุ่ม
          right: '20px',
          width: settings.width,
          height: settings.height,
          backgroundColor: settings.bgColor,
          borderRadius: settings.borderRadius,
          boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          overflow: 'hidden',
          zIndex: 1001,
          transition: 'all 0.3s ease'
        }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between p-4"
          style={{ 
            backgroundColor: settings.buttonColor,
            color: '#ffffff'
          }}
        >
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              🤖
            </div>
            <div>
              <div className="font-medium text-sm">แชทบอท</div>
              <div className="text-xs opacity-80">
              {isLoading ? 'กำลังพิมพ์...' : 'ออนไลน์'}
            </div>
            </div>
          </div>

                    <div className="flex items-center space-x-1">
            {/* ปุ่มเมนู */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:bg-white hover:bg-opacity-20"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#ffffff'
                }}
              >
                {/* <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
                </svg> */}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>

              </button>
              
              {/* เมนูแบบเลื่อนลง */}
              {showMenu && (
                <div 
                  className="absolute top-10 right-0 bg-white rounded-lg shadow-lg py-2 z-50 min-w-[180px]"
                  style={{ border: '1px solid #e1e5e9' }}
                >
                  {/* คู่มือการใช้งาน */}
                  <button
                    onClick={() => {
                      window.open('/manual/manual.txt', '_blank')
                      setShowMenu(false)
                    }}
                    className="w-full px-4 py-2 text-left text-sm bg-white hover:bg-gray-300 flex items-center space-x-2"
                    style={{ color: settings.textColor }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>คู่มือการใช้งาน</span>
                  </button>
                  
                  {/* Private Chat */}

                  {/* <button
                    onClick={() => {
                      window.open('/', '_blank')
                      setShowMenu(false)
                    }}
                    className="w-full px-4 py-2 text-left text-sm bg-white hover:bg-gray-300 flex items-center space-x-2"
                    style={{ color: settings.textColor }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <span>Private Chat</span>
                  </button> */}
                </div>
              )}
            </div>
            
            {/* ปุ่มปิด */}
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:bg-white hover:bg-opacity-20"
              style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff'
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div 
          className="flex-1 overflow-y-auto p-4 space-y-3"
          style={{ 
            height: `calc(${settings.height} - 140px)`,
            backgroundColor: settings.bgColor 
          }}
        >
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className="max-w-[80%] px-3 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: msg.sender === 'user' 
                    ? settings.buttonColor 
                    : '#f1f3f4',
                  color: msg.sender === 'user' ? '#ffffff' : settings.textColor
                }}
              >
                {renderMessage(msg)}
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <form onSubmit={handleSendMessage} className="p-4 border-t">
          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="พิมพ์ข้อความ..."
              className="flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none transition-all"
              style={{ 
                borderColor: '#e1e5e9'
              } as React.CSSProperties}
              onFocus={(e) => {
                e.target.style.boxShadow = `0 0 0 1px ${settings.buttonColor}`
                e.target.style.borderColor = settings.buttonColor
              }}
              onBlur={(e) => {
                e.target.style.boxShadow = 'none'
                e.target.style.borderColor = '#e1e5e9'
              }}
            />
            <button
              type="submit"
              className="px-3 py-2 text-white rounded-lg hover:opacity-90 transition-opacity"
              style={{ backgroundColor: settings.buttonColor }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    )}

    {/* Float Button - อยู่ตำแหน่งเดิมตลอด */}
    <button
      onClick={() => setIsOpen(!isOpen)}
      className="relative w-16 h-16 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110"
      style={{ 
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 1002,
        backgroundColor: settings.buttonColor,
        color: '#ffffff'
      }}
    >
      <div className="flex items-center justify-center">
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </div>
      
      {/* Badge แสดงจำนวนข้อความใหม่ */}
      {/* {!isOpen && messages.length > 1 && (
        <div 
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold animate-pulse"
          style={{ backgroundColor: '#ef4444', color: '#ffffff' }}
        >
          {messages.length - 1}
        </div>
      )} */}
    </button>
  </div>
)
}