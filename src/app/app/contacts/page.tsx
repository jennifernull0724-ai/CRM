'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search,
  Plus,
  Upload,
  Filter,
  Download,
  Users,
  MoreVertical,
  CheckSquare,
  AlertCircle,
  Clock,
  Archive,
  UserPlus,
} from 'lucide-react'

interface Contact {
  id: string
  firstName: string
  lastName: string
  company: string
  email: string | null
  phone: string | null
  ownerId: string
  owner: {
    firstName: string | null
    lastName: string | null
    email: string
  }
  lastActivity: Date | null
  status: string
  _count: {
    tasks: number
  }
}

export default function ContactsListPage() {
  const router = useRouter()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  
  const [filters, setFilters] = useState({
    owner: '',
    company: '',
    lastActivity: '',
    hasOpenTasks: false,
    hasOverdueTasks: false,
    hasEstimates: false,
    hasApprovedEstimates: false,
    status: 'ACTIVE',
  })

  useEffect(() => {
    fetchContacts()
  }, [filters, searchQuery])

  const fetchContacts = async () => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams({
        search: searchQuery,
        ...filters,
      })
      
      const response = await fetch(`/api/contacts?${queryParams}`)
      const data = await response.json()
      
      if (response.ok) {
        setContacts(data.contacts || [])
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAll = () => {
    if (selectedContacts.length === contacts.length) {
      setSelectedContacts([])
    } else {
      setSelectedContacts(contacts.map(c => c.id))
    }
  }

  const handleSelectContact = (contactId: string) => {
    if (selectedContacts.includes(contactId)) {
      setSelectedContacts(selectedContacts.filter(id => id !== contactId))
    } else {
      setSelectedContacts([...selectedContacts, contactId])
    }
  }

  const handleBulkArchive = async () => {
    if (!confirm(`Archive ${selectedContacts.length} contacts?`)) return
    
    try {
      const response = await fetch('/api/contacts/bulk-archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactIds: selectedContacts }),
      })
      
      if (response.ok) {
        setSelectedContacts([])
        fetchContacts()
      }
    } catch (error) {
      console.error('Bulk archive failed:', error)
    }
  }

  const handleBulkReassign = async () => {
    const newOwnerId = prompt('Enter new owner email:')
    if (!newOwnerId) return
    
    try {
      const response = await fetch('/api/contacts/bulk-reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactIds: selectedContacts, newOwnerEmail: newOwnerId }),
      })
      
      if (response.ok) {
        setSelectedContacts([])
        fetchContacts()
      }
    } catch (error) {
      console.error('Bulk reassign failed:', error)
    }
  }

  const getActivityColor = (lastActivity: Date | null) => {
    if (!lastActivity) return 'text-red-600'
    
    const daysSince = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysSince === 0) return 'text-green-600'
    if (daysSince <= 7) return 'text-blue-600'
    if (daysSince <= 30) return 'text-yellow-600'
    return 'text-red-600'
  }

  const formatLastActivity = (lastActivity: Date | null) => {
    if (!lastActivity) return 'No activity'
    
    const daysSince = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysSince === 0) return 'Today'
    if (daysSince === 1) return 'Yesterday'
    if (daysSince <= 7) return `${daysSince} days ago`
    if (daysSince <= 30) return `${Math.floor(daysSince / 7)} weeks ago`
    return `${Math.floor(daysSince / 30)} months ago`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-600 mt-1">
            {contacts.length} total contacts
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Link
            href="/app/contacts/import"
            className="px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition flex items-center"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Link>
          
          <Link
            href="/app/contacts/new"
            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Contact
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search contacts by name, email, company, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          
          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 border ${showFilters ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-700'} font-semibold rounded-lg hover:bg-gray-50 transition flex items-center`}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Last Activity
              </label>
              <select
                value={filters.lastActivity}
                onChange={(e) => setFilters({ ...filters, lastActivity: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              >
                <option value="">All</option>
                <option value="today">Today</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="none">No activity</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              >
                <option value="ACTIVE">Active</option>
                <option value="ARCHIVED">Archived</option>
                <option value="">All</option>
              </select>
            </div>

            <div className="col-span-2 flex items-end space-x-2">
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={filters.hasOpenTasks}
                  onChange={(e) => setFilters({ ...filters, hasOpenTasks: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span>Has open tasks</span>
              </label>
              
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={filters.hasOverdueTasks}
                  onChange={(e) => setFilters({ ...filters, hasOverdueTasks: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span>Has overdue tasks</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedContacts.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CheckSquare className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-blue-900">
              {selectedContacts.length} contacts selected
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleBulkReassign}
              className="px-4 py-2 bg-white border border-blue-300 text-blue-700 font-semibold rounded-lg hover:bg-blue-50 transition flex items-center text-sm"
            >
              <UserPlus className="w-4 h-4 mr-1" />
              Reassign Owner
            </button>
            
            <button
              onClick={handleBulkArchive}
              className="px-4 py-2 bg-white border border-blue-300 text-blue-700 font-semibold rounded-lg hover:bg-blue-50 transition flex items-center text-sm"
            >
              <Archive className="w-4 h-4 mr-1" />
              Archive
            </button>
          </div>
        </div>
      )}

      {/* Contacts Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-12 px-6 py-3">
                <input
                  type="checkbox"
                  checked={selectedContacts.length === contacts.length && contacts.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Company
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Owner
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Last Activity
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Open Tasks
              </th>
              <th className="w-12 px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  Loading contacts...
                </td>
              </tr>
            ) : contacts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="font-semibold">No contacts found</p>
                  <p className="text-sm mt-1">Create your first contact or import from CSV</p>
                </td>
              </tr>
            ) : (
              contacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedContacts.includes(contact.id)}
                      onChange={() => handleSelectContact(contact.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/app/contacts/${contact.id}`}
                      className="font-semibold text-gray-900 hover:text-blue-600"
                    >
                      {contact.firstName} {contact.lastName}
                    </Link>
                    {contact.email && (
                      <div className="text-sm text-gray-500">{contact.email}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-900">
                    {contact.company}
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    {contact.owner.firstName} {contact.owner.lastName}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <Clock className={`w-4 h-4 ${getActivityColor(contact.lastActivity)}`} />
                      <span className={`text-sm ${getActivityColor(contact.lastActivity)}`}>
                        {formatLastActivity(contact.lastActivity)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {contact._count.tasks > 0 ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {contact._count.tasks}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-gray-400 hover:text-gray-600">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
