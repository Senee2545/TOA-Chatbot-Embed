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
    dataSource: 'DOA-chat'  // ค่าเริ่มต้นเป็น 'DOA-chat'
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
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Navigation */}
          <div className="flex items-center justify-between mb-6">
            <nav className="flex items-center space-x-4">
              {/* <Link href="/" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                หน้าแรก
              </Link> */}
              <Link href="/protected" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                แชท
              </Link>
              <span className="text-blue-600 font-medium px-3 py-2">
                สร้างแชทบอท
              </span>
            </nav>
          </div>
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
              ปรับแต่งแชทบอทของคุณ
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              สร้างและปรับแต่งแชทบอทให้เข้ากับแบรนด์ของคุณ พร้อมฝังในเว็บไซต์ได้ทันที
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
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
          <div className="xl:col-span-2 space-y-6">
            {/* Live Preview */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b">
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-semibold text-gray-800 ">
                    ตัวอย่างการแสดงผล
                  </h3>
                </div>
              </div>
              <div className="p-6">
                <PreviewFrame settings={settings} />
                <div className="mt-4 text-sm text-gray-500 text-center">
                  ขนาด: {settings.width} × {settings.height} พิกเซล
                </div>
              </div>
            </div>

            {/* Embed Code Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-green-50 to-blue-50 px-6 py-4 border-b">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                  <span className="text-xl mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
                    </svg>
                  </span>
                  โค้ดสำหรับฝังในเว็บไซต์
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  คัดลอกโค้ดด้านล่างและวางในเว็บไซต์ของคุณ
                </p>
              </div>
              <div className="p-6">
                <div className="relative">
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto border">
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

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={copyIframeCode}
                    className="flex items-center justify-center space-x-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md"
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
                    className="flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md"
                  >
                    <Eye size={18} />
                    <span>ทดสอบ</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Features Section */}
            {/* <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <span className="text-xl mr-2">✨</span>
                คุณสมบัติเด่น
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                    🎨
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">ปรับแต่งได้เต็มที่</h4>
                    <p className="text-sm text-gray-600">เปลี่ยนสี ขนาด และรูปแบบได้ตามต้องการ</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="bg-green-100 text-green-600 p-2 rounded-lg">
                    📱
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Responsive</h4>
                    <p className="text-sm text-gray-600">ใช้งานได้บนทุกอุปกรณ์</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="bg-purple-100 text-purple-600 p-2 rounded-lg">
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
      <footer className="bg-gray-50 border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>ปรับแต่งแชทบอทและพร้อมฝังในเว็บไซต์ได้ทันที</p>
          </div>
        </div>
      </footer>
    </div>
  )
}