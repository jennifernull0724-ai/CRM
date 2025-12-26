'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Download,
} from 'lucide-react'

interface ParsedRow {
  company: string
  firstName: string
  lastName: string
  email: string
  phone: string
  title: string
  errors: string[]
  isValid: boolean
}

export default function ImportContactsPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedRow[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importResults, setImportResults] = useState<any>(null)
  const [error, setError] = useState('')

  const validateRow = (row: any): ParsedRow => {
    const errors: string[] = []
    
    if (!row.company?.trim()) errors.push('Company is required')
    if (!row.firstName?.trim()) errors.push('First name is required')
    if (!row.lastName?.trim()) errors.push('Last name is required')
    
    if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
      errors.push('Invalid email format')
    }

    return {
      company: row.company || '',
      firstName: row.firstName || '',
      lastName: row.lastName || '',
      email: row.email || '',
      phone: row.phone || '',
      title: row.title || '',
      errors,
      isValid: errors.length === 0,
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setError('')
    setIsProcessing(true)
    setParsedData([])
    setImportResults(null)

    try {
      const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase()

      if (fileExtension === 'csv') {
        // Parse CSV
        Papa.parse(selectedFile, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const validated = results.data.map(validateRow)
            setParsedData(validated)
            setIsProcessing(false)
          },
          error: (error) => {
            setError(`CSV parsing error: ${error.message}`)
            setIsProcessing(false)
          },
        })
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        // Parse Excel
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer)
            const workbook = XLSX.read(data, { type: 'array' })
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
            const jsonData = XLSX.utils.sheet_to_json(firstSheet)
            const validated = jsonData.map(validateRow)
            setParsedData(validated)
            setIsProcessing(false)
          } catch (err: any) {
            setError(`Excel parsing error: ${err.message}`)
            setIsProcessing(false)
          }
        }
        reader.readAsArrayBuffer(selectedFile)
      } else {
        setError('Please upload a CSV or Excel file')
        setIsProcessing(false)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process file')
      setIsProcessing(false)
    }
  }

  const handleImport = async () => {
    const validRows = parsedData.filter(row => row.isValid)
    
    if (validRows.length === 0) {
      setError('No valid rows to import')
      return
    }

    if (!confirm(`Import ${validRows.length} valid contacts? Invalid rows will be skipped.`)) {
      return
    }

    setIsImporting(true)
    setError('')

    try {
      const response = await fetch('/api/contacts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts: validRows }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Import failed')
      }

      setImportResults(data)
    } catch (err: any) {
      setError(err.message || 'Import failed')
    } finally {
      setIsImporting(false)
    }
  }

  const validCount = parsedData.filter(row => row.isValid).length
  const invalidCount = parsedData.length - validCount

  if (importResults) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Import Complete!
          </h2>
          
          <div className="space-y-2 mb-8">
            <p className="text-gray-600">
              Successfully imported <span className="font-bold text-green-600">{importResults.imported}</span> contacts
            </p>
            {importResults.skipped > 0 && (
              <p className="text-gray-600">
                Skipped <span className="font-bold text-yellow-600">{importResults.skipped}</span> invalid rows
              </p>
            )}
          </div>

          <div className="flex items-center justify-center space-x-4">
            <Link
              href="/app/contacts"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
            >
              View Contacts
            </Link>
            
            <button
              onClick={() => {
                setFile(null)
                setParsedData([])
                setImportResults(null)
              }}
              className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
            >
              Import More
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/app/contacts"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Contacts
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Import Contacts</h1>
        <p className="text-gray-600 mt-2">
          Upload a CSV or Excel file to bulk import contacts
        </p>
      </div>

      {/* File Upload */}
      <div className="bg-white rounded-xl border border-gray-200 p-8 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Step 1: Upload File
        </h2>

        {!file ? (
          <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition">
            <Upload className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-lg font-semibold text-gray-700 mb-2">
              Click to upload or drag and drop
            </p>
            <p className="text-sm text-gray-500">
              CSV or Excel (.xlsx, .xls) files only
            </p>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        ) : (
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <p className="font-semibold text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
            
            <button
              onClick={() => {
                setFile(null)
                setParsedData([])
              }}
              className="text-red-600 hover:text-red-700 font-semibold"
            >
              Remove
            </button>
          </div>
        )}

        {/* Template Download */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-900 mb-2">
                Required Headers
              </p>
              <p className="text-sm text-blue-800 mb-3">
                Your file must include these columns: <span className="font-mono">company, firstName, lastName, email, phone, title</span>
              </p>
              <a
                href="/templates/contact-import-template.csv"
                download
                className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                <Download className="w-4 h-4 mr-1" />
                Download Template
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      {parsedData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">
              Step 2: Review & Import
            </h2>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-sm font-semibold text-green-600">
                  {validCount} Valid
                </span>
              </div>
              {invalidCount > 0 && (
                <div className="flex items-center space-x-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="text-sm font-semibold text-red-600">
                    {invalidCount} Invalid
                  </span>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              {error}
            </div>
          )}

          {/* Preview Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Company
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Errors
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {parsedData.slice(0, 50).map((row, index) => (
                  <tr key={index} className={row.isValid ? '' : 'bg-red-50'}>
                    <td className="px-4 py-3">
                      {row.isValid ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {row.company}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {row.firstName} {row.lastName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {row.email}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {row.phone}
                    </td>
                    <td className="px-4 py-3 text-sm text-red-600">
                      {row.errors.join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {parsedData.length > 50 && (
              <div className="mt-4 text-center text-sm text-gray-500">
                Showing first 50 rows of {parsedData.length}
              </div>
            )}
          </div>

          {/* Import Button */}
          <div className="mt-6 flex items-center justify-end space-x-4">
            <Link
              href="/app/contacts"
              className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </Link>
            
            <button
              onClick={handleImport}
              disabled={isImporting || validCount === 0}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                  Importing...
                </>
              ) : (
                `Import ${validCount} Contacts`
              )}
            </button>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <Loader2 className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Processing file...</p>
        </div>
      )}
    </div>
  )
}
