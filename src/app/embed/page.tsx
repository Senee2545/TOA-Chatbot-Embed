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
  //
  botName: string
  botIcon: string
}

export default function EmbedPage() {
  const [settings, setSettings] = useState<EmbedSettings>({
    width: '400',
    height: '600',
    bgColor: '#ffffff',
    textColor: '#000000',
    buttonColor: '#007bff',
    borderRadius: '8',
    dataSource: 'DOA-chat3',  // ค่าเริ่มต้นเป็น 'DOA-chat2'
    botName: 'แชทบอท', //  ค่า default
    botIcon: '/images/logo.png', //  ค่า default
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
      dataSource: settings.dataSource,
      //
      botName: settings.botName,
      botIcon: settings.botIcon,
    })

    return `<iframe
      id="chat-frame"
      src="${baseUrl}/chat-widget?${queryParams.toString()}"
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '${settings.width}px',
        height: '${settings.height}px',
        border: 'none',
        background: 'transparent',
        zIndex: '10',
        pointerEvents: 'auto',
        borderRadius: '${settings.borderRadius}px'
      }}
      title="Chatbot Widget"
    />`
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
                        dataSource: settings.dataSource,
                        botName: settings.botName,
                        botIcon: settings.botIcon,
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

            {/* 🆕 คู่มือการฝังโค้ด */}
        <div className="p-6 border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 1 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="mb-2 text-lg font-semibold text-blue-900">
                คู่มือการฝังแชทบอท
              </h3>
              <div className="space-y-4 text-sm text-blue-800">
                
                {/* วิธีการติดตั้ง */}
                <div>
                  <h4 className="flex items-center mb-2 font-medium">
                    <span className="flex items-center justify-center w-5 h-5 mr-2 text-xs font-bold text-blue-700 bg-blue-200 rounded-full">1</span>
                    วิธีการติดตั้ง
                  </h4>
                  <ul className="space-y-1 text-blue-700 ml-7">
                    <li>• คัดลอกโค้ด iframe จากด้านลบนไปวางในหน้าเว็บของคุณ</li>
                  </ul>
                </div>

                {/* ตัวอย่างการใช้งาน */}
                <div>
                  <h4 className="flex items-center mb-2 font-medium">
                    <span className="flex items-center justify-center w-5 h-5 mr-2 text-xs font-bold text-blue-700 bg-blue-200 rounded-full">2</span>
                    เพิ่มโค้ดควบคุมการเปิด–ปิดแชทบอท
                  </h4>
                  <div className="p-3 overflow-x-auto font-mono text-xs text-green-400 bg-gray-800 rounded-lg ml-7">
                    <pre>{`useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'chatbot-visibility') {
        const iframe = document.getElementById('chat-frame') as HTMLIFrameElement;
        if (!iframe) return;

        if (event.data.isOpen) {
          // เปิดแชท → ขยาย iframe 
          const src = iframe.getAttribute('src');
          const params = new URLSearchParams(src?.split('?')[1]);
          const width = params.get('width');
          const height = params.get('height');

          const widthNum = width ? parseInt(width.replace('px', '')) + 40 : 440;
          const heightNum = height ? parseInt(height.replace('px', '')) + 100 : 700;

          iframe.style.width = \`\${widthNum}px\`;
          iframe.style.height = \`\${heightNum}px\`;
        } else {
          // ปิดแชท → ย่อ iframe ให้เหลือเท่าปุ่ม
          iframe.style.width = '100px';
          iframe.style.height = '100px';
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);`}</pre>
                  </div>
                </div>

                
              </div>
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