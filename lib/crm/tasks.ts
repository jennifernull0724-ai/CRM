import { prisma } from '@/lib/prisma'

export type CrmTaskRow = {
  id: string
  title: string
  status: 'open' | 'completed'
  updatedAt: Date
  dueDate: Date | null
  contactName: string
  dealName: string | null
}

export async function getCrmTasks(companyId: string, userId: string): Promise<CrmTaskRow[]> {
  const tasks = await prisma.task.findMany({
    where: {
      assignedToId: userId,
      contact: { companyId: companyId },
    },
    select: {
      id: true,
      title: true,
      completed: true,
      updatedAt: true,
      dueDate: true,
      contact: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      deal: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [
      { completed: 'asc' },
      { dueDate: 'asc' },
      { updatedAt: 'desc' },
    ],
    take: 200,
  })

  return tasks.map((task) => ({
    id: task.id,
    title: task.title,
    status: task.completed ? 'completed' : 'open',
    updatedAt: task.updatedAt,
    dueDate: task.dueDate,
    contactName: `${task.contact.firstName} ${task.contact.lastName}`.trim(),
    dealName: task.deal?.name ?? null,
  }))
}
