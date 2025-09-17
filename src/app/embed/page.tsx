'use client'

import { useState } from 'react'
import EmbedForm from '../components/EmbedForm'
import PreviewFrame from '../components/PreviewFrame'
import { Copy, Eye } from 'lucide-react';
import Link from 'next/link';

interface EmbedSettings {
  width: string
  height: string
  bgColor: string
  textColor: string
  buttonColor: string
  borderRadius: string 
  dataSource: string
}

export default function EmbedPage() {
  const [settings, setSettings] = useState<EmbedSettings>({
    width: '400',
    height: '600',
    bgColor: '#ffffff',
    textColor: '#000000',
    buttonColor: '#007bff',
    borderRadius: '8',
    dataSource: 'DOA-chat2'  // ค่าเริ่มต้นเป็น 'DOA-chat'
  })
  const [copied, setCopied] = useState(false)

  const handleSettingsChange = (newSettings: EmbedSettings) => {
    setSettings(newSettings)
    // TODO: บันทึกการตั้งค่าลง database
    // await saveUserSettings(newSettings)
  }

  const generateIframeCode = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const queryParams = new URLSearchParams({
      width: `${settings.width}px`,
      height: `${settings.height}px`,
      bgColor: settings.bgColor,
      textColor: settings.textColor,
      buttonColor: settings.buttonColor,
      borderRadius: `${settings.borderRadius}px`,
      position: 'bottom-right',
      dataSource: settings.dataSource
    })

    return `<iframe
  src="${baseUrl}/chat-widget?${queryParams.toString()}"
  style="
    position: fixed;
    bottom: 0;
    right: 0;
    width: 100vw;
    height: 100vh;
    border: none;
    background: transparent;
    z-index: 9999;
    pointer-events: auto;
  "
  title="Chatbot Widget">
</iframe>`
  }

  const copyIframeCode = async () => {
    try {
      const iframeCode = generateIframeCode()
      await navigator.clipboard.writeText(iframeCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('ไม่สามารถคัดลอกได้:', err)
      alert('เกิดข้อผิดพลาดในการคัดลอก')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header Section */}
      <div className="bg-white border-b shadow-sm">
        <div className="px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
          {/* Navigation */}
          <div className="flex items-center justify-between mb-6">
            <nav className="flex items-center space-x-4">
              {/* <Link href="/" className="px-3 py-2 text-gray-600 transition-colors rounded-lg hover:text-gray-900 hover:bg-gray-100">
                หน้าแรก
              </Link> */}
              <Link href="/protected" className="px-3 py-2 text-gray-600 transition-colors rounded-lg hover:text-gray-900 hover:bg-gray-100">
                แชท
              </Link>
              <span className="px-3 py-2 font-medium text-blue-600">
                สร้างแชทบอท
              </span>
            </nav>
          </div>
          <div className="text-center">
            <h1 className="mb-3 text-3xl font-bold text-gray-900 sm:text-4xl">
              ปรับแต่งแชทบอทของคุณ
            </h1>
            <p className="max-w-2xl mx-auto text-lg text-gray-600">
              สร้างและปรับแต่งแชทบอทให้เข้ากับแบรนด์ของคุณ พร้อมฝังในเว็บไซต์ได้ทันที
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3 lg:gap-8">
          {/* Form Section */}
          <div className="xl:col-span-1">
            <div className="sticky top-8">
              <EmbedForm
                settings={settings}
                onSettingsChange={handleSettingsChange}
              />
            </div>
          </div>

          {/* Preview & Code Section */}
          <div className="space-y-6 xl:col-span-2">
            {/* Live Preview */}
            <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-xl">
              <div className="px-6 py-4 border-b bg-gradient-to-r from-gray-50 to-gray-100">
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-semibold text-gray-800 ">
                    ตัวอย่างการแสดงผล
                  </h3>
                </div>
              </div>
              <div className="p-6">
                <PreviewFrame settings={settings} />
                <div className="mt-4 text-sm text-center text-gray-500">
                  ขนาด: {settings.width} × {settings.height} พิกเซล
                </div>
              </div>
            </div>

            {/* Embed Code Section */}
            <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-xl">
              <div className="px-6 py-4 border-b bg-gradient-to-r from-green-50 to-blue-50">
                <h3 className="flex items-center text-lg font-semibold text-gray-800">
                  <span className="mr-2 text-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
                    </svg>
                  </span>
                  โค้ดสำหรับฝังในเว็บไซต์
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  คัดลอกโค้ดด้านล่างและวางในเว็บไซต์ของคุณ
                </p>
              </div>
              <div className="p-6">
                <div className="relative">
                  <pre className="p-4 overflow-x-auto text-sm text-gray-100 bg-gray-900 border rounded-lg">
                    <code className="language-html">{generateIframeCode()}</code>
                  </pre>
                  <button
                    onClick={copyIframeCode}
                    className={`absolute top-3 right-3 px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 ${copied
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                      }`}
                  >
                    {copied ? (
                      <span className="flex items-center space-x-1">
                        <Copy size={18} />
                        <span>คัดลอกแล้ว</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1">
                        <Copy size={18} />
                        <span>คัดลอก</span>
                      </span>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 mt-6 sm:grid-cols-2">
                  <button
                    onClick={copyIframeCode}
                    className="flex items-center justify-center px-6 py-3 space-x-2 font-medium text-white transition-all duration-200 transform rounded-lg shadow-md bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 hover:scale-105"
                  >
                    <Copy size={18} />
                    <span>คัดลอกโค้ด</span>
                  </button>

                  <button
                    onClick={() => {
                      const url = `/chat-widget?${new URLSearchParams({
                        width: `${settings.width}px`,
                        height: `${settings.height}px`,
                        bgColor: settings.bgColor,
                        textColor: settings.textColor,
                        buttonColor: settings.buttonColor,
                        borderRadius: `${settings.borderRadius}px`,
                        position: 'bottom-right',
                        dataSource: settings.dataSource
                      }).toString()}`
                      window.open(url, '_blank')
                    }}
                    className="flex items-center justify-center px-6 py-3 space-x-2 font-medium text-white transition-all duration-200 transform rounded-lg shadow-md bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 hover:scale-105"
                  >
                    <Eye size={18} />
                    <span>ทดสอบ</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Features Section */}
            {/* <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
              <h3 className="flex items-center mb-4 text-lg font-semibold text-gray-800">
                <span className="mr-2 text-xl">✨</span>
                คุณสมบัติเด่น
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="flex items-start space-x-3">
                  <div className="p-2 text-blue-600 bg-blue-100 rounded-lg">
                    🎨
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">ปรับแต่งได้เต็มที่</h4>
                    <p className="text-sm text-gray-600">เปลี่ยนสี ขนาด และรูปแบบได้ตามต้องการ</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="p-2 text-green-600 bg-green-100 rounded-lg">
                    📱
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Responsive</h4>
                    <p className="text-sm text-gray-600">ใช้งานได้บนทุกอุปกรณ์</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="p-2 text-purple-600 bg-purple-100 rounded-lg">
                    ⚡
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">ง่ายต่อการใช้งาน</h4>
                    <p className="text-sm text-gray-600">คัดลอกโค้ดและวางได้ทันที</p>
                  </div>
                </div>
              </div>
            </div> */}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-16 border-t bg-gray-50">
        <div className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="text-center text-gray-600">
            <p>ปรับแต่งแชทบอทและพร้อมฝังในเว็บไซต์ได้ทันที</p>
          </div>
        </div>
      </footer>
    </div>
  )
}