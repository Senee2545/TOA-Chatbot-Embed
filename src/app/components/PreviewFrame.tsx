'use client'

import React, { useState } from 'react'

interface EmbedSettings {
  width: string
  height: string
  bgColor: string
  textColor: string
  buttonColor: string
  borderRadius: string
  dataSource: string
  botName: string
  botIcon: string
}

interface PreviewFrameProps {
  settings: EmbedSettings
}

export default function PreviewFrame({ settings }: PreviewFrameProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  const generatePreviewUrl = () => {
    const queryParams = new URLSearchParams({
      width: `${settings.width}px`,
      height: `${settings.height}px`,
      bgColor: settings.bgColor,
      textColor: settings.textColor,
      buttonColor: settings.buttonColor,
      borderRadius: `${settings.borderRadius}px`,
      position: 'center', // สำหรับ preview ให้อยู่กลาง
      dataSource: settings.dataSource,
      botName: settings.botName,
      botIcon: settings.botIcon || '🤖',  
    })

    return `/chat-widget?${queryParams.toString()}`
  }

  const generateEmbedUrl = () => {
    const queryParams = new URLSearchParams({
      width: `${settings.width}px`,
      height: `${settings.height}px`,
      bgColor: settings.bgColor,
      textColor: settings.textColor,
      buttonColor: settings.buttonColor,
      borderRadius: `${settings.borderRadius}px`,
      position: 'bottom-right', // สำหรับ embed จริงให้อยู่มุมขวาล่าง
      dataSource: settings.dataSource,
      botName: settings.botName,
      botIcon: settings.botIcon || '🤖',
    })

    return `/chat-widget?${queryParams.toString()}`
  }

  const openFullscreen = () => {
    setIsFullscreen(true)
  }

  const closeFullscreen = () => {
    setIsFullscreen(false)
  }

  const openInNewTab = () => {
    window.open(generateEmbedUrl(), '_blank')
  }

  // คำนวณขนาดสำหรับ scaling ให้พอดีกับพื้นที่ preview
  const maxPreviewWidth = 320
  const maxPreviewHeight = 400
  const scaleX = maxPreviewWidth / parseInt(settings.width)
  const scaleY = maxPreviewHeight / parseInt(settings.height)
  const scale = Math.min(scaleX, scaleY, 1) // ไม่ให้ scale เกิน 1

  return (
    <>
      {/* Main Preview */}
      <div className="relative">
        {/* Preview Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-gray-700">ดูตัวอย่างของ chatbot ตามการตั้งค่าที่คุณเลือก</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={openFullscreen}
              className="p-2 text-gray-500 hover:text-gray-700 bg-white hover:bg-gray-100 border-2 border-gray-200 rounded-lg transition-all"
              title="ขยายเต็มจอ"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
            <button
              onClick={openInNewTab}
              className="p-2 text-gray-500 hover:text-gray-700  bg-white hover:bg-gray-100 border-2 border-gray-200 rounded-lg transition-all"
              title="เปิดในแท็บใหม่"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
          </div>
        </div>

        {/* Clean Preview Container */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl overflow-hidden border border-gray-200">
          {/* Browser Mockup Header */}
          <div className="bg-white px-4 py-3 flex items-center space-x-2 border-b border-gray-200">
            <div className="flex space-x-1.5">
              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            </div>
            <div className="flex-1 bg-gray-50 rounded-md px-3 py-1.5 text-xs text-gray-500 ml-4 font-mono">
              https://yourwebsite.com
            </div>
          </div>

          {/* Preview Area - ลบ background ซ้อน */}
          <div 
            className="flex items-center justify-center p-8"
            style={{ 
              minHeight: `${Math.max(400, parseInt(settings.height) * scale + 60)}px`,
              background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
              
            }}
          >
            {/* Chatbot Preview */}
            <div 
              className="transition-all duration-300 ease-in-out"
              style={{
                transform: `scale(${scale})`,
                transformOrigin: 'center'
              }}
            >
              <iframe
                src={generatePreviewUrl()}
                width={settings.width}
                height={settings.height}
                style={{
                  border: 'none',
                  borderRadius: `${settings.borderRadius}px`,
                  //boxShadow: '0 20px 40px rgba(0,0,0,0.1), 0 10px 20px rgba(0,0,0,0.05)',
                  backgroundColor: settings.bgColor
                }}
                title="Chatbot Preview"
              />
            </div>
          </div>

          {/* Preview Info */}
          <div className="bg-white px-4 py-3 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
              <div className="text-sm text-gray-600">
                <span className="inline-flex items-center space-x-1">
                  <span>📏</span>
                  <span>{settings.width} × {settings.height} px</span>
                  {scale < 1 && (
                    <span className="text-xs text-gray-500">
                      (ย่อ {Math.round(scale * 100)}%)
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center space-x-3 text-xs">
                <div className="flex items-center space-x-1">
                  <div 
                    className="w-3 h-3 rounded border shadow-sm"
                    style={{ backgroundColor: settings.bgColor }}
                  />
                  <span className="text-gray-500">พื้นหลัง</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div 
                    className="w-3 h-3 rounded border shadow-sm"
                    style={{ backgroundColor: settings.buttonColor }}
                  />
                  <span className="text-gray-500">ปุ่ม</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-gray-400">📐</span>
                  <span className="text-gray-500">{settings.borderRadius}px</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-full max-h-full">
            <button
              onClick={closeFullscreen}
              className="absolute -top-16 right-0 text-black hover:text-gray-300 transition-colors z-10 bg-white hover:bg-gray-100 rounded-full p-2 shadow-lg"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <iframe
              src={generatePreviewUrl()}
              width={settings.width}
              height={settings.height}
              style={{
                border: 'none',
                borderRadius: `${settings.borderRadius}px`,
                maxWidth: '90vw',
                maxHeight: '90vh',
                boxShadow: '0 25px 50px rgba(0,0,0,0.3)'
              }}
              title="Chatbot Preview Fullscreen"
              className="bg-white"
            />
          </div>
        </div>
      )}
    </>
  )
}