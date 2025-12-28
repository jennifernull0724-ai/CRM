import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const [companiesCount, contactsCount, projectsCount, activitiesCount] = await Promise.all([
    prisma.company.count(),
    prisma.contact.count(),
    prisma.project.count(),
    prisma.activity.count(),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Companies</h3>
          <p className="text-3xl font-bold text-gray-900">{companiesCount}</p>
          <Link href="/companies" className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block">
            View all →
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Contacts</h3>
          <p className="text-3xl font-bold text-gray-900">{contactsCount}</p>
          <Link href="/contacts" className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block">
            View all →
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Projects</h3>
          <p className="text-3xl font-bold text-gray-900">{projectsCount}</p>
          <Link href="/projects" className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block">
            View all →
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Activities</h3>
          <p className="text-3xl font-bold text-gray-900">{activitiesCount}</p>
          <Link href="/activities" className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block">
            View all →
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/companies/new"
            className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 text-center font-medium"
          >
            + New Company
          </Link>
          <Link
            href="/contacts/new"
            className="bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 text-center font-medium"
          >
            + New Contact
          </Link>
          <Link
            href="/projects/new"
            className="bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 text-center font-medium"
          >
            + New Project
          </Link>
          <Link
            href="/activities/new"
            className="bg-orange-600 text-white px-4 py-3 rounded-lg hover:bg-orange-700 text-center font-medium"
          >
            + New Activity
          </Link>
        </div>
      </div>
    </div>
  );
}
