/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { useState, useEffect } from 'react'
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

export default function ChatWidget(props: { email: string; id: string }) {
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
    dataSource: 'chat8'
  })

//   useEffect(() => {
//     const params = new URLSearchParams(window.location.search)
//     setSettings({
//       width: params.get('width') || '350px',
//       height: params.get('height') || '500px',
//       bgColor: params.get('bgColor') || '#ffffff',
//       textColor: params.get('textColor') || '#000000',
//       buttonColor: params.get('buttonColor') || '#007bff',
//       borderRadius: params.get('borderRadius') || '12px',
//       position: params.get('position') || 'center',
//       dataSource: params.get('dataSource') || 'chat5'
//     })

//     if (params.get('position') === 'bottom-right') {
//       document.body.style.background = 'transparent'
//       document.documentElement.style.background = 'transparent'
//     }

//     // ถ้าเป็น center แสดงว่าเป็น preview ให้เปิดไว้เลย
//     if (params.get('position') === 'center') {
//       setIsOpen(true)
//     }
//   }, [])



// const handleSendMessage = async (e: React.FormEvent) => {
//     e.preventDefault()
//     if (input.trim() && !isLoading) {
//       const userMessage: Message = { text: input, sender: 'user' }
//       setMessages(prev => [...prev, userMessage])
      
//       const userInput = input
//       setInput('')
//       setIsLoading(true)
      
//       try {
//         // เรียก API chat8
//         const response = await fetch('/api/chat5', {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//           },
//           body: JSON.stringify({
//             messages: [{ role: 'user', content: userInput }]
//           }),
//         })

//         if (!response.ok) {
//           throw new Error('Network response was not ok')
//         }

//         // อ่าน streaming response
//         const reader = response.body?.getReader()
//         const decoder = new TextDecoder()
        
//         if (reader) {
//           let accumulatedText = ''
          
//           // เพิ่ม empty bot message สำหรับ streaming
//           setMessages(prev => [...prev, { text: '', sender: 'bot' }])
          
//           while (true) {
//             const { done, value } = await reader.read()
            
//             if (done) break
            
//             const chunk = decoder.decode(value)
//             accumulatedText += chunk
            
//             // อัพเดทข้อความแบบ real-time
//             setMessages(prev => {
//               const newMessages = [...prev]
//               const lastIndex = newMessages.length - 1
//               newMessages[lastIndex] = {
//                 text: accumulatedText,
//                 sender: 'bot'
//               }
//               return newMessages
//             })
//           }
//         }
        
//       } catch (error) {
//         console.error('Error:', error)
//         setMessages(prev => [...prev, { 
//           text: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง 😔', 
//           sender: 'bot' 
//         }])
//       } finally {
//         setIsLoading(false)
//       }
//     }
//   }

useEffect(() => {
    console.log('📋 Current embed settings:', settings)
}, [settings])

useEffect(() => {
    console.log('🟢 useEffect triggered - reading URL parameters')
    
    const params = new URLSearchParams(window.location.search)
    
    console.log('🔗 Full URL:', window.location.href)
    console.log('🔗 Search params:', window.location.search)
    console.log('🔗 DataSource param:', params.get('dataSource'))
    
    const newSettings = {
      width: params.get('width') || '350px',
      height: params.get('height') || '500px',
      bgColor: params.get('bgColor') || '#ffffff',
      textColor: params.get('textColor') || '#000000',
      buttonColor: params.get('buttonColor') || '#007bff',
      borderRadius: params.get('borderRadius') || '12px',
      position: params.get('position') || 'center',
      dataSource: params.get('dataSource') || 'chat5'
    }
    
    console.log('🎯 New settings to set:', newSettings)
    console.log('🎯 Previous settings:', settings)
    
    setSettings(newSettings)
    
    console.log('🎯 Settings updated to:', newSettings)

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
    console.log('🔄 Settings changed:', settings)
}, [settings])

// const handleSendMessage = async (e: React.FormEvent) => {
//     e.preventDefault()
//     if (input.trim() && !isLoading) {
//       const userMessage: Message = { text: input, sender: 'user', isCompleted: true }
//       setMessages(prev => [...prev, userMessage])
      
//       const userInput = input
//       setInput('')
//       setIsLoading(true)
      
//       try {
//         // ✅ ใช้ dataSource ที่เลือกมาแทน hardcode chat5
//         const apiEndpoint = `/api/${settings.dataSource}`
        
//         console.log('🔥 เรียก API:', apiEndpoint) // เพิ่ม log เพื่อ debug
        
//         const response = await fetch(apiEndpoint, {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//           },
//           body: JSON.stringify({
//             messages: [{ role: 'user', content: userInput }]
//           }),
//         })

//         if (!response.ok) {
//           throw new Error('Network response was not ok')
//         }

//         // รับ JSON response
//         const data = await response.json()
        
//         // เพิ่มข้อความบอทแบบยังไม่เสร็จ (จะมี typewriter animation)
//         const botMessage: Message = { 
//           text: JSON.stringify(data.content),
//           sender: 'bot',
//           isCompleted: false
//         }
//         setMessages(prev => [...prev, botMessage])

//         // หลังจาก animation เสร็จ (3-5 วินาที) ค่อย mark เป็นเสร็จ
//         setTimeout(() => {
//           setMessages(prev => {
//             const newMessages = [...prev]
//             const lastBotIndex = newMessages.findLastIndex(msg => msg.sender === 'bot')
//             if (lastBotIndex !== -1) {
//               newMessages[lastBotIndex] = {
//                 ...newMessages[lastBotIndex],
//                 isCompleted: true
//               }
//             }
//             return newMessages
//           })
//         }, 4000)
        
//       } catch (error) {
//         console.error('Error:', error)
//         setMessages(prev => [...prev, { 
//           text: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง 😔', 
//           sender: 'bot',
//           isCompleted: true
//         }])
//       } finally {
//         setIsLoading(false)
//       }
//     }
//   }


const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isLoading) {
      console.log('📤 Sending message...')
      console.log('🎯 Current settings state:', settings)
      console.log('🎯 DataSource from state:', settings.dataSource)
      
      // อ่าน URL อีกครั้งเพื่อความแน่ใจ
      const params = new URLSearchParams(window.location.search)
      const urlDataSource = params.get('dataSource') || 'chat5'
      
      console.log('🔗 DataSource from URL (fresh read):', urlDataSource)
      console.log('⚖️ Comparison - State vs URL:', settings.dataSource, 'vs', urlDataSource)
      
      const userMessage: Message = { text: input, sender: 'user', isCompleted: true }
      setMessages(prev => [...prev, userMessage])
      
      const userInput = input
      setInput('')
      setIsLoading(true)
      
      try {
        // ใช้ dataSource จาก URL เพื่อความแน่ใจ
        const apiEndpoint = `/api/${urlDataSource}`
        
        console.log('🔥 API endpoint to call:', apiEndpoint)
        
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: userInput }]
          }),
        })

        console.log('📡 API response status:', response.status)

        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.status}`)
        }

        // รับ JSON response
        const data = await response.json()
        console.log('📥 API response data:', data)
        
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
        // ✅ ถ้าข้อความเสร็จแล้ว แสดงปกติ ไม่ใช้ ResponseStream
        if (msg.isCompleted) {
          return (
            <div className="whitespace-pre-line">
              {JSON.parse(msg.text)}
            </div>
          )
        } else {
          // ✅ ถ้ายังไม่เสร็จ ใช้ ResponseStream (สำหรับ streaming)
          return (
            <ResponseStream
              textStream={JSON.parse(msg.text)}
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
      {!isOpen && messages.length > 1 && (
        <div 
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold animate-pulse"
          style={{ backgroundColor: '#ef4444', color: '#ffffff' }}
        >
          {messages.length - 1}
        </div>
      )}
    </button>
  </div>
)
}