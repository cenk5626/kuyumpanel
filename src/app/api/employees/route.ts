import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

const LOG_PREFIX = '[API Employees]';

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dealerIdParam = searchParams.get('dealerId');

    const currentUserRole = (session.user as any).role;
    const currentUserDealerId = (session.user as any).dealerId;

    // Filter by dealerId if provided, or default to current user's dealerId if they are ADMIN/TABLET/PC
    let targetDealerId = dealerIdParam;
    if (currentUserRole !== 'SUPER_ADMIN') {
      targetDealerId = currentUserDealerId;
    }

    if (!targetDealerId) {
      // If SUPER_ADMIN requests all employees
      const allEmployees = await prisma.employee.findMany({
        include: {
          dealer: {
            select: { name: true }
          }
        },
        orderBy: { name: 'asc' }
      });
      return NextResponse.json(allEmployees);
    }

    const employees = await prisma.employee.findMany({
      where: { dealerId: targetDealerId },
      include: {
        dealer: {
          select: { name: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(employees);
  } catch (error) {
    console.error(`${LOG_PREFIX} GET Error:`, error);
    return NextResponse.json({ error: 'Çalışanlar listelenemedi.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, dealerId } = body;

    if (!name) {
      return NextResponse.json({ error: 'Çalışan ismi zorunludur.' }, { status: 400 });
    }

    const currentUserRole = (session.user as any).role;
    const currentUserDealerId = (session.user as any).dealerId;

    // Set dealerId based on user role
    let targetDealerId = dealerId;
    if (currentUserRole !== 'SUPER_ADMIN') {
      targetDealerId = currentUserDealerId;
    }

    if (!targetDealerId) {
      return NextResponse.json({ error: 'Bayi seçimi zorunludur.' }, { status: 400 });
    }

    const newEmployee = await prisma.employee.create({
      data: {
        name,
        dealerId: targetDealerId,
      },
      include: {
        dealer: {
          select: { name: true }
        }
      }
    });

    return NextResponse.json(newEmployee);
  } catch (error) {
    console.error(`${LOG_PREFIX} POST Error:`, error);
    return NextResponse.json({ error: 'Çalışan eklenemedi.' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, name, dealerId } = body;

    if (!id || !name) {
      return NextResponse.json({ error: 'Eksik parametreler.' }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      return NextResponse.json({ error: 'Çalışan bulunamadı.' }, { status: 404 });
    }

    const currentUserRole = (session.user as any).role;
    const currentUserDealerId = (session.user as any).dealerId;

    // Access check
    if (currentUserRole !== 'SUPER_ADMIN' && employee.dealerId !== currentUserDealerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let targetDealerId = dealerId;
    if (currentUserRole !== 'SUPER_ADMIN') {
      targetDealerId = currentUserDealerId;
    }

    const updatedEmployee = await prisma.employee.update({
      where: { id },
      data: {
        name,
        dealerId: targetDealerId || employee.dealerId,
      },
      include: {
        dealer: {
          select: { name: true }
        }
      }
    });

    return NextResponse.json(updatedEmployee);
  } catch (error) {
    console.error(`${LOG_PREFIX} PUT Error:`, error);
    return NextResponse.json({ error: 'Çalışan bilgileri güncellenemedi.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID parametresi zorunludur.' }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      return NextResponse.json({ error: 'Çalışan bulunamadı.' }, { status: 404 });
    }

    const currentUserRole = (session.user as any).role;
    const currentUserDealerId = (session.user as any).dealerId;

    if (currentUserRole !== 'SUPER_ADMIN' && employee.dealerId !== currentUserDealerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.employee.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`${LOG_PREFIX} DELETE Error:`, error);
    return NextResponse.json({ error: 'Çalışan silinemedi.' }, { status: 500 });
  }
}
