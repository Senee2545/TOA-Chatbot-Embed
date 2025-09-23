/* eslint-disable @next/next/no-img-element */
'use client'

import React, { useState, useEffect, useRef } from 'react'
//import Image from 'next/image'

interface EmbedSettings {
  width: string
  height: string
  bgColor: string
  textColor: string
  buttonColor: string
  borderRadius: string
  dataSource: string

  // image icon config
  botName:  string
  botIcon: string
}

interface EmbedFormProps {
  settings: EmbedSettings
  onSettingsChange: (settings: EmbedSettings) => void
}

// 🔧 เพิ่ม Debug ใน isImageUrl function
const isImageUrl = (raw: string) => {
  if (!raw) return false
  const str = raw.trim()
  return (
    /^https?:\/\/.+/i.test(str) ||      // http/https
    /^data:image\//i.test(str) ||       // base64 data url
    /^blob:/.test(str)                  // blob url
  )
}

export default function EmbedForm({ settings, onSettingsChange }: EmbedFormProps) {
  //const [saved, setSaved] = useState(false)

  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<string>('')



  // ฐานข้อมูลที่มีให้เลือก
  const dataSources = [
    {
      id: 'chat8',
      name: 'การออกกำลังกาย',
      description: 'ข้อมูลเกี่ยวกับการออกกำลังกาย และโภชนาการ',
      icon: ''
    },
    {
      id: 'DOA-chat2',
      name: 'DOA',
      description: 'ข้อมูลเกี่ยวกับApproval',
      icon: ''
    },
  ]


  // ฟังก์ชันเช็คว่าเป็น URL หรือไม่
// 🔧 แก้ไขฟังก์ชันให้เช็ค undefined/null

const lastObjectUrlRef = useRef<string | null>(null)

useEffect(() => {
  const v = (settings.botIcon || '').trim()
  if (v.startsWith('blob:')) {
    if (lastObjectUrlRef.current && lastObjectUrlRef.current !== v) {
      URL.revokeObjectURL(lastObjectUrlRef.current)
    }
    lastObjectUrlRef.current = v
  }
  return () => {
    if (lastObjectUrlRef.current) {
      URL.revokeObjectURL(lastObjectUrlRef.current)
      lastObjectUrlRef.current = null
    }
  }
}, [settings.botIcon])


const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0]
  if (!file) return

  if (file.size > 2 * 1024 * 1024) {
    setUploadError('ขนาดไฟล์ใหญ่เกินไป (ไม่เกิน 2MB)')
    return
  }
  if (!file.type.startsWith('image/')) {
    setUploadError('กรุณาเลือกไฟล์รูปภาพเท่านั้น')
    return
  }

  setUploadError('')
  setUploadProgress(100)

  // ✅ ใช้ Blob URL
  const objectUrl = URL.createObjectURL(file)
  handleChange('botIcon', objectUrl)

  // ✅ ปิด progress ทันทีที่ตั้งค่าเสร็จ (กันค้าง 100%)
  setTimeout(() => setUploadProgress(null), 0)
}




  const handleChange = (key: keyof EmbedSettings, value: string) => {
    const newSettings = { ...settings, [key]: value }
    onSettingsChange(newSettings)
  }

  //const handleSaveSettings = async () => {
    // TODO: บันทึกการตั้งค่าลง database
    // try {
    //   await fetch('/api/settings', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(settings)
    //   })
    //   setSaved(true)
    //   setTimeout(() => setSaved(false), 2000)
    // } catch (error) {
    //   alert('เกิดข้อผิดพลาดในการบันทึก')
    // }
    //setSaved(true)
    //setTimeout(() => setSaved(false), 2000)
  //}

  const presetColors = [
    { name: 'Blue', bg: '#ffffff', text: '#1f2937', button: '#3b82f6' },
    { name: 'Green', bg: '#f0fdf4', text: '#1f2937', button: '#22c55e' },
    { name: 'Purple', bg: '#faf5ff', text: '#1f2937', button: '#a855f7' },
    { name: 'Red', bg: '#fef2f2', text: '#1f2937', button: '#ef4444' },
    { name: 'Dark', bg: '#bbbcbe', text: '#1f2937', button: '#2a2c92' },
  ]

  const applyPreset = (preset: typeof presetColors[0]) => {
    const newSettings = {
      ...settings,
      bgColor: preset.bg,
      textColor: preset.text,
      buttonColor: preset.button,
    }
    onSettingsChange(newSettings)
  }


// 🔧 Component แสดง Icon
const BotIcon = ({ icon, className = "" }: { icon: string, className?: string }) => {
  const v = (icon || '').trim()
  if (!v) {
    return (
      <img
        src="/images/logo.png"
        alt="Bot Icon"
        className={`${className} object-cover rounded-full`}
        onError={(e) => {
          const target = e.currentTarget
          target.style.display = 'none'
          if (target.parentElement) {
            target.parentElement.innerHTML = '<span class="text-2xl">🤖</span>'
          }
        }}
      />
    )
  }

  const mustBeImg = /^data:image\//i.test(v) || /^blob:/i.test(v)
  if (mustBeImg || isImageUrl(v)) {
    return (
      <img
        src={v}
        alt="Bot Icon"
        className={`${className} object-cover rounded-full`}
        crossOrigin="anonymous"
        onLoad={() => setUploadProgress(null)}  
        onError={(e) => {
          const target = e.currentTarget
          target.style.display = 'none'
          if (target.parentElement) {
            target.parentElement.innerHTML = '<img src="/images/logo.png" alt="Bot Icon" class="' + className + ' object-cover rounded-full" onerror="this.outerHTML=\'<span class=\\"text-2xl\\">🤖</span>\'">'
          }
        }}
      />
    )
  }
   // ถ้า v เป็น path รูป ให้แสดงเป็นรูป
  if (v.startsWith('/') || v.startsWith('http')) {
    return (
      <img
        src={v}
        alt="Bot Icon"
        className={`${className} object-cover rounded-full`}
        onError={(e) => {
          const target = e.currentTarget
          target.style.display = 'none'
          if (target.parentElement) {
            target.parentElement.innerHTML = '<span class="text-2xl">🤖</span>'
          }
        }}
      />
    )
  }

  return <span className={className}>{v || '🤖'}</span>
}


  return (
    <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-xl">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
        <h2 className="flex items-center text-xl font-semibold text-gray-800">
          <span className="mr-2 text-2xl">
            {/* Setting Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
            </svg>
          </span>
          การตั้งค่า
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          ปรับแต่งรูปแบบแชทบอทของคุณ
        </p>
      </div>

      <div className="p-6 space-y-6">


            {/* ชื่อแชทบอท */}
            <div>
              <label className="block mb-2 text-xs font-medium text-gray-500">
                ชื่อแชทบอท
              </label>
              <input
                type="text"
                value={settings.botName}
                onChange={(e) => handleChange('botName', e.target.value)}
                className="w-full px-3 py-2 transition-all border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ชื่อแชทบอทของคุณ"
              />
            </div>




            <div>
              <label className="block mb-2 text-xs font-medium text-gray-500">
                ไอคอนแชทบอท
              </label>
              
              {/* พรีวิว Icon */}
          <div className="flex items-center mb-3 space-x-3">
            <div className="flex items-center justify-center w-12 h-12 overflow-hidden bg-white border border-gray-300 rounded-lg">
              <BotIcon 
        icon={settings.botIcon} 
        className={isImageUrl(settings.botIcon || '') ? "w-full h-full object-cover" : "text-lg"}
        
      />

            </div>
          
<div className="text-sm text-gray-600">
  {(settings.botIcon && settings.botIcon.startsWith('data:')) ? '📁 ไฟล์จากเครื่อง' :
   isImageUrl(settings.botIcon || '') ? 'รูปภาพ URL' : 'Emoji Icon'}
</div>
          </div>


              {/* 🆕 File Upload Section */}
          <div className="space-y-3">
            {/* Upload Button */}
            <div className="relative">
              <input
                type="file"
                id="iconUpload"
                accept="image/*"
                onChange={handleFileUpload}
                className="sr-only"
              />
              <label
                htmlFor="iconUpload"
                className="flex items-center justify-center w-full px-4 py-3 transition-all duration-200 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50"
              >
                <div className="text-center">
                  {uploadProgress !== null ? (
                    <div className="space-y-2">
                      <div className="w-6 h-6 mx-auto border-2 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                      <div className="text-xs text-blue-600">กำลังอัปโหลด {Math.round(uploadProgress)}%</div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <svg className="w-8 h-8 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <div className="text-sm text-gray-600">คลิกเพื่อเลือกรูป</div>
                      <div className="text-xs text-gray-500">PNG, JPG, GIF ขนาดไม่เกิน 2MB</div>
                    </div>
                  )}
                </div>
              </label>
            </div>
            {/* Upload Error */}
            {uploadError && (
              <div className="flex items-center px-3 py-2 space-x-2 text-red-600 rounded-lg bg-red-50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-sm">{uploadError}</span>
              </div>
            )}

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 text-gray-500 bg-white">Preview</span>
              </div>
            </div>






{/* พรีวิวแชทบอท */}
<div className="p-3 bg-white border border-gray-200 rounded-lg">
  <p className="mb-2 text-xs font-medium text-gray-500">Header:</p>
  <div className="flex items-center space-x-3">
    <div 
      className="flex items-center justify-center w-10 h-10 overflow-hidden rounded-full"
      style={{ 
        backgroundColor: settings.buttonColor + '20', 
        color: settings.buttonColor,
        border: `2px solid ${settings.buttonColor}40`
      }}
    >
      <BotIcon 
        icon={settings.botIcon} 
        className={isImageUrl(settings.botIcon || '') ? "w-full h-full object-cover" : "text-lg"}
      />
    </div>
    <div>
      <div className="text-sm font-medium" style={{ color: settings.textColor }}>
        {settings.botName || 'แชทบอท'}
      </div>
    </div>
  </div>
</div>
            
            </div>
            </div>

        {/* เพิ่มส่วนเลือกฐานข้อมูล */}
        <div>
          <label className="flex items-center mb-3 text-sm font-medium text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mr-2 size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
            </svg>
            เลือกฐานข้อมูล
          </label>
          <div className="space-y-3">
            {dataSources.map((source) => (
              <label
                key={source.id}
                className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-50 ${settings.dataSource === source.id
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                    : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <input
                  type="radio"
                  name="dataSource"
                  value={source.id}
                  checked={settings.dataSource === source.id}
                  onChange={(e) => handleChange('dataSource', e.target.value)}
                  className="mt-1 mr-3 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{source.icon}</span>
                    <span className="font-medium text-gray-900">{source.name}</span>
                    {settings.dataSource === source.id && (
                      <span className="px-2 py-1 text-xs text-white bg-blue-500 rounded-full">
                        เลือกแล้ว
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    {source.description}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Color Presets */}
        <div>
          <label className="flex items-center mb-3 text-sm font-medium text-gray-700 ">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mr-2 size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />
            </svg>
            ธีมสีสำเร็จรูป
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {presetColors.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className="relative p-2 transition-all duration-200 bg-white border-2 border-gray-200 rounded-lg group hover:border-gray-300 hover:scale-105 hover:bg-gray-50"
                title={`ธีม ${preset.name}`}
              >
                <div className="flex items-center space-x-1">
                  <div
                    className="w-4 h-4 border rounded"
                    style={{ backgroundColor: preset.bg }}
                  />
                  <div
                    className="w-4 h-4 border rounded"
                    style={{ backgroundColor: preset.button }}
                  />
                </div>
                <div className="mt-1 text-xs text-gray-600 group-hover:text-gray-800">
                  {preset.name}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ขนาด */}
        <div>
          <label className="flex items-center mb-3 text-sm font-medium text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mr-2 size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6A1.125 1.125 0 0 1 2.25 10.875v-3.75ZM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 0 1-1.125-1.125v-8.25ZM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25A1.125 1.125 0 0 1 3.75 18.375v-2.25Z" />
            </svg>
            ขนาด
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block mb-2 text-xs font-medium text-gray-500">
                ความกว้าง (px)
              </label>
              <input
                type="number"
                value={settings.width}
                onChange={(e) => handleChange('width', e.target.value)}
                className="w-full px-3 py-2 transition-all border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="200"
                max="800"
                placeholder="400"
              />
            </div>
            <div>
              <label className="block mb-2 text-xs font-medium text-gray-500">
                ความสูง (px)
              </label>
              <input
                type="number"
                value={settings.height}
                onChange={(e) => handleChange('height', e.target.value)}
                className="w-full px-3 py-2 transition-all border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="300"
                max="800"
                placeholder="600"
              />
            </div>
          </div>
        </div>

        {/* สี */}
        <div>
          <label className="flex items-center mb-3 text-sm font-medium text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mr-2 size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />
            </svg>
            สีและธีม
          </label>
          <div className="space-y-4">
            {/* สีพื้นหลัง */}
            <div>
              <label className="block mb-2 text-xs font-medium text-gray-500">
                สีพื้นหลัง
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={settings.bgColor}
                  onChange={(e) => handleChange('bgColor', e.target.value)}
                  className="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.bgColor}
                  onChange={(e) => handleChange('bgColor', e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="#ffffff"
                />
              </div>
            </div>

            {/* สีข้อความ */}
            <div>
              <label className="block mb-2 text-xs font-medium text-gray-500">
                สีข้อความ
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={settings.textColor}
                  onChange={(e) => handleChange('textColor', e.target.value)}
                  className="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.textColor}
                  onChange={(e) => handleChange('textColor', e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="#000000"
                />
              </div>
            </div>

            {/* สีปุ่ม */}
            <div>
              <label className="block mb-2 text-xs font-medium text-gray-500">
                สีปุ่ม
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={settings.buttonColor}
                  onChange={(e) => handleChange('buttonColor', e.target.value)}
                  className="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.buttonColor}
                  onChange={(e) => handleChange('buttonColor', e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="#007bff"
                />
              </div>
            </div>
          </div>
        </div>

        {/* มุมโค้ง */}
        <div>
          <label className="flex items-center mb-3 text-sm font-medium text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mr-2 size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" />
            </svg>
            มุมโค้ง
          </label>
          <div className="space-y-2">
            <input
              type="range"
              min="0"
              max="20"
              value={settings.borderRadius}
              onChange={(e) => handleChange('borderRadius', e.target.value)}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>เหลี่ยม</span>
              <span className="font-medium text-blue-600">
                {settings.borderRadius}px
              </span>
              <span>มน</span>
            </div>
          </div>
          
        </div>

        {/* Save Button */}
        {/* <button
          onClick={handleSaveSettings}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 ${saved
              ? 'bg-green-500 text-white'
              : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-md'
            }`}
        >
          {saved ? '✅ บันทึกเรียบร้อย' : '💾 บันทึกการตั้งค่า'}
        </button> */}

        

        
      </div>
    </div>
  )
}