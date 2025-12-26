'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, User, Building2, Mail, Phone, Briefcase, 
  Calendar, CheckSquare, MessageSquare, Clock, Send,
  Plus, MoreVertical, Archive, Edit3, FileText
} from 'lucide-react';

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  email?: string;
  phone?: string;
  title?: string;
  status: string;
  owner: {
    firstName?: string;
    lastName?: string;
    email: string;
  };
  lastActivity?: string;
  createdAt: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  completed: boolean;
  completedAt?: string;
  assignee: {
    firstName?: string;
    lastName?: string;
    email: string;
  };
}

interface Note {
  id: string;
  content: string;
  author: {
    firstName?: string;
    lastName?: string;
    email: string;
  };
  createdAt: string;
}

interface Activity {
  id: string;
  type: string;
  title: string;
  description?: string;
  user: {
    firstName?: string;
    lastName?: string;
    email: string;
  };
  createdAt: string;
}

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contactId = params.contactId as string;

  const [contact, setContact] = useState<Contact | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'notes' | 'activity' | 'email'>('overview');
  const [loading, setLoading] = useState(true);

  // Task creation form
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');

  // Note creation form
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteContent, setNoteContent] = useState('');

  useEffect(() => {
    loadContact();
    loadTasks();
    loadNotes();
    loadActivities();
  }, [contactId]);

  const loadContact = async () => {
    try {
      const res = await fetch(`/api/contacts/${contactId}`);
      if (res.ok) {
        const data = await res.json();
        setContact(data);
      }
    } catch (error) {
      console.error('Failed to load contact:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    try {
      const res = await fetch(`/api/contacts/${contactId}/tasks`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const loadNotes = async () => {
    try {
      const res = await fetch(`/api/contacts/${contactId}/notes`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data);
      }
    } catch (error) {
      console.error('Failed to load notes:', error);
    }
  };

  const loadActivities = async () => {
    try {
      const res = await fetch(`/api/contacts/${contactId}/activity`);
      if (res.ok) {
        const data = await res.json();
        setActivities(data);
      }
    } catch (error) {
      console.error('Failed to load activities:', error);
    }
  };

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/contacts/${contactId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskTitle,
          description: taskDescription,
          dueDate: taskDueDate || undefined,
        }),
      });
      if (res.ok) {
        setTaskTitle('');
        setTaskDescription('');
        setTaskDueDate('');
        setShowTaskForm(false);
        loadTasks();
        loadActivities();
      }
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const completeTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/complete`, {
        method: 'POST',
      });
      if (res.ok) {
        loadTasks();
        loadActivities();
      }
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  };

  const createNote = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/contacts/${contactId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: noteContent,
        }),
      });
      if (res.ok) {
        setNoteContent('');
        setShowNoteForm(false);
        loadNotes();
        loadActivities();
      }
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Contact not found</h2>
          <Link href="/app/contacts" className="text-blue-600 hover:underline mt-4 inline-block">
            Back to Contacts
          </Link>
        </div>
      </div>
    );
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'NOTE': return <MessageSquare className="h-4 w-4" />;
      case 'TASK_CREATED': return <CheckSquare className="h-4 w-4" />;
      case 'TASK_COMPLETED': return <CheckSquare className="h-4 w-4" />;
      case 'EMAIL_SENT': return <Send className="h-4 w-4" />;
      case 'CALL': return <Phone className="h-4 w-4" />;
      case 'MEETING': return <Calendar className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-8 py-6">
          <Link 
            href="/app/contacts" 
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contacts
          </Link>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {contact.firstName} {contact.lastName}
              </h1>
              <div className="mt-2 flex items-center gap-4 text-gray-600">
                <span className="inline-flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  {contact.company}
                </span>
                {contact.title && (
                  <span className="inline-flex items-center gap-1">
                    <Briefcase className="h-4 w-4" />
                    {contact.title}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex gap-2">
              <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 inline-flex items-center gap-2">
                <Edit3 className="h-4 w-4" />
                Edit
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-8">
          <div className="flex gap-8 border-b border-gray-200">
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'tasks', label: 'Tasks' },
              { key: 'notes', label: 'Notes' },
              { key: 'activity', label: 'Activity' },
              { key: 'email', label: 'Email' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-4 px-2 font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 py-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Contact Info */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
                <dl className="grid grid-cols-1 gap-4">
                  {contact.email && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Email</dt>
                      <dd className="mt-1 flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                          {contact.email}
                        </a>
                      </dd>
                    </div>
                  )}
                  {contact.phone && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Phone</dt>
                      <dd className="mt-1 flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <a href={`tel:${contact.phone}`} className="text-blue-600 hover:underline">
                          {contact.phone}
                        </a>
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Owner</dt>
                    <dd className="mt-1 flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      {contact.owner.firstName || contact.owner.lastName
                        ? `${contact.owner.firstName || ''} ${contact.owner.lastName || ''}`.trim()
                        : contact.owner.email}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
                <div className="space-y-4">
                  {activities.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex gap-3">
                      <div className="flex-shrink-0 text-gray-400 mt-1">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                        {activity.description && (
                          <p className="text-sm text-gray-500">{activity.description}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(activity.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {activities.length === 0 && (
                    <p className="text-gray-500 text-sm">No activity yet</p>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-semibold mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setShowTaskForm(true)}
                    className="w-full px-4 py-2 text-left border border-gray-300 rounded-md hover:bg-gray-50 inline-flex items-center gap-2"
                  >
                    <CheckSquare className="h-4 w-4" />
                    Create Task
                  </button>
                  <button
                    onClick={() => setShowNoteForm(true)}
                    className="w-full px-4 py-2 text-left border border-gray-300 rounded-md hover:bg-gray-50 inline-flex items-center gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Add Note
                  </button>
                  <button className="w-full px-4 py-2 text-left border border-gray-300 rounded-md hover:bg-gray-50 inline-flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Send Email
                  </button>
                  <Link
                    href={`/app/estimating/new?contactId=${contactId}`}
                    className="w-full px-4 py-2 text-left border border-gray-300 rounded-md hover:bg-gray-50 inline-flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Create Estimate
                  </Link>
                </div>
              </div>

              {/* Open Tasks */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-semibold mb-4">Open Tasks</h3>
                <div className="space-y-2">
                  {tasks.filter(t => !t.completed).map((task) => (
                    <div key={task.id} className="p-3 border border-gray-200 rounded-md">
                      <p className="text-sm font-medium">{task.title}</p>
                      {task.dueDate && (
                        <p className="text-xs text-gray-500 mt-1">
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ))}
                  {tasks.filter(t => !t.completed).length === 0 && (
                    <p className="text-gray-500 text-sm">No open tasks</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Tasks</h2>
              <button
                onClick={() => setShowTaskForm(!showTaskForm)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Task
              </button>
            </div>

            {showTaskForm && (
              <form onSubmit={createTask} className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Task Title *
                    </label>
                    <input
                      type="text"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Enter task title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={taskDescription}
                      onChange={(e) => setTaskDescription(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Enter task description"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={taskDueDate}
                      onChange={(e) => setTaskDueDate(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Create Task
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowTaskForm(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-4 border rounded-md ${
                    task.completed ? 'bg-gray-50 border-gray-200' : 'border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => !task.completed && completeTask(task.id)}
                      disabled={task.completed}
                      className="mt-1 h-4 w-4 text-blue-600 rounded"
                    />
                    <div className="flex-1">
                      <h3 className={`font-medium ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                      )}
                      <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                        {task.dueDate && (
                          <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                        )}
                        <span>
                          Assigned to: {task.assignee.firstName || task.assignee.email}
                        </span>
                        {task.completedAt && (
                          <span>Completed: {new Date(task.completedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {tasks.length === 0 && (
                <p className="text-gray-500 text-center py-8">No tasks yet</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Notes</h2>
              <button
                onClick={() => setShowNoteForm(!showNoteForm)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Note
              </button>
            </div>

            {showNoteForm && (
              <form onSubmit={createNote} className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Note Content *
                    </label>
                    <textarea
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      required
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Enter your note... Use @username to mention someone"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Add Note
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNoteForm(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            )}

            <div className="space-y-4">
              {notes.map((note) => (
                <div key={note.id} className="p-4 border border-gray-200 rounded-md">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="font-medium text-sm">
                        {note.author.firstName || note.author.email}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(note.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">{note.content}</p>
                </div>
              ))}
              {notes.length === 0 && (
                <p className="text-gray-500 text-center py-8">No notes yet</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-6">Activity Timeline</h2>
            <div className="space-y-4">
              {activities.map((activity, index) => (
                <div key={activity.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      {getActivityIcon(activity.type)}
                    </div>
                    {index < activities.length - 1 && (
                      <div className="w-px h-full bg-gray-200 mt-2"></div>
                    )}
                  </div>
                  <div className="flex-1 pb-8">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{activity.title}</p>
                        {activity.description && (
                          <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          {activity.user.firstName || activity.user.email} • {new Date(activity.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 uppercase tracking-wide">
                        {activity.type.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {activities.length === 0 && (
                <p className="text-gray-500 text-center py-8">No activity yet</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'email' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-6">Email</h2>
            <div className="text-center py-12 text-gray-500">
              <Send className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>Email composer coming soon</p>
              <p className="text-sm mt-2">Connect Gmail or Outlook to send emails</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
