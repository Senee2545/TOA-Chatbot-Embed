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
}

interface EmbedFormProps {
  settings: EmbedSettings
  onSettingsChange: (settings: EmbedSettings) => void
}

export default function EmbedForm({ settings, onSettingsChange }: EmbedFormProps) {
  const [saved, setSaved] = useState(false)

  // ฐานข้อมูลที่มีให้เลือก
  const dataSources = [
    { 
      id: 'chat5', 
      name: 'ข้อมูลบุคลากร', 
      description: 'ข้อมูลพนักงาน ตำแหน่ง และแผนกต่างๆ',
      icon: '📋'
    },
    { 
      id: 'chat8', 
      name: 'การออกกำลังกาย', 
      description: 'ข้อมูลเกี่ยวกับการออกกำลังกาย และโภชนาการ',
      icon: '👥'
    },
    { 
      id: 'DOA-chat', 
      name: 'DOA', 
      description: 'ข้อมูลเกี่ยวกับApproval',
      icon: '📑'
    },
  ]

  const handleChange = (key: keyof EmbedSettings, value: string) => {
    const newSettings = { ...settings, [key]: value }
    onSettingsChange(newSettings)
  }

  const handleSaveSettings = async () => {
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
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-b">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center">
          <span className="text-2xl mr-2">⚙️</span>
          การตั้งค่า
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          ปรับแต่งรูปแบบแชทบอทของคุณ
        </p>
      </div>

      <div className="p-6 space-y-6">

        {/* เพิ่มส่วนเลือกฐานข้อมูล */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            🗄️ เลือกฐานข้อมูล
          </label>
          <div className="space-y-3">
            {dataSources.map((source) => (
              <label
                key={source.id}
                className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-50 ${
                  settings.dataSource === source.id
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
                      <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                        เลือกแล้ว
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {source.description}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Color Presets */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            🎨 ธีมสีสำเร็จรูป
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {presetColors.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className="group relative p-2 rounded-lg border-2 border-gray-200 hover:border-gray-300 transition-all duration-200 hover:scale-105 bg-white hover:bg-gray-50"
                title={`ธีม ${preset.name}`}
              >
                <div className="flex items-center space-x-1">
                  <div 
                    className="w-4 h-4 rounded border"
                    style={{ backgroundColor: preset.bg }}
                  />
                  <div 
                    className="w-4 h-4 rounded border"
                    style={{ backgroundColor: preset.button }}
                  />
                </div>
                <div className="text-xs text-gray-600 mt-1 group-hover:text-gray-800">
                  {preset.name}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ขนาด */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            📐 ขนาด
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">
                ความกว้าง (px)
              </label>
              <input
                type="number"
                value={settings.width}
                onChange={(e) => handleChange('width', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                min="200"
                max="800"
                placeholder="400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">
                ความสูง (px)
              </label>
              <input
                type="number"
                value={settings.height}
                onChange={(e) => handleChange('height', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                min="300"
                max="800"
                placeholder="600"
              />
            </div>
          </div>
        </div>

        {/* สี */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            🎨 สีและธีม
          </label>
          <div className="space-y-4">
            {/* สีพื้นหลัง */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">
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
              <label className="block text-xs font-medium text-gray-500 mb-2">
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
              <label className="block text-xs font-medium text-gray-500 mb-2">
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
          <label className="block text-sm font-medium text-gray-700 mb-3">
            📱 มุมโค้ง
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
        <button
          onClick={handleSaveSettings}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 ${
            saved
              ? 'bg-green-500 text-white'
              : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-md'
          }`}
        >
          {saved ? '✅ บันทึกเรียบร้อย' : '💾 บันทึกการตั้งค่า'}
        </button>
      </div>
    </div>
  )
}