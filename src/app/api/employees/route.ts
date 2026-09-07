import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedContext, assertTenantOwnership } from '@/lib/security/auth-context';

export const dynamic = 'force-dynamic';

const LOG_PREFIX = '[API Employees]';

export async function GET(req: Request) {
  try {
    const ctx = await getAuthenticatedContext();
    const currentUserRole = ctx.role;
    const currentUserDealerId = ctx.dealerId;

    const { searchParams } = new URL(req.url);
    const dealerIdParam = searchParams.get('dealerId');

    // Filter by dealerId if provided, or default to current user's dealerId if they are not SUPER_ADMIN
    let targetDealerId = dealerIdParam;
    if (currentUserRole !== 'SUPER_ADMIN') {
      targetDealerId = currentUserDealerId;
    }

    if (!targetDealerId) {
      // If SUPER_ADMIN requests all employees
      const allEmployees = await prisma.employee.findMany({
        include: {
          dealer: {
            select: { name: true },
          },
        },
        orderBy: { name: 'asc' },
      });
      return NextResponse.json(allEmployees);
    }

    const employees = await prisma.employee.findMany({
      where: { dealerId: targetDealerId },
      include: {
        dealer: {
          select: { name: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(employees);
  } catch (error: any) {
    console.error(`${LOG_PREFIX} GET Error:`, error);
    return NextResponse.json({ error: error?.message || 'Çalışanlar listelenemedi.' }, { status: error?.statusCode || 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getAuthenticatedContext();
    const currentUserRole = ctx.role;
    const currentUserDealerId = ctx.dealerId;

    const body = await req.json();
    const { name, dealerId } = body;

    if (!name) {
      return NextResponse.json({ error: 'Çalışan ismi zorunludur.' }, { status: 400 });
    }

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
          select: { name: true },
        },
      },
    });

    return NextResponse.json(newEmployee, { status: 201 });
  } catch (error: any) {
    console.error(`${LOG_PREFIX} POST Error:`, error);
    return NextResponse.json({ error: error?.message || 'Çalışan eklenemedi.' }, { status: error?.statusCode || 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const ctx = await getAuthenticatedContext();
    const currentUserRole = ctx.role;
    const currentUserDealerId = ctx.dealerId;

    const body = await req.json();
    const { id, name, dealerId } = body;

    if (!id || !name) {
      return NextResponse.json({ error: 'Eksik parametreler.' }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      return NextResponse.json({ error: 'Çalışan bulunamadı.' }, { status: 404 });
    }
    assertTenantOwnership(ctx, employee.dealerId, 'Çalışan');

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
          select: { name: true },
        },
      },
    });

    return NextResponse.json(updatedEmployee);
  } catch (error: any) {
    console.error(`${LOG_PREFIX} PUT Error:`, error);
    return NextResponse.json({ error: error?.message || 'Çalışan bilgileri güncellenemedi.' }, { status: error?.statusCode || 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await getAuthenticatedContext();
    const currentUserRole = ctx.role;
    const currentUserDealerId = ctx.dealerId;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID parametresi zorunludur.' }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      return NextResponse.json({ error: 'Çalışan bulunamadı.' }, { status: 404 });
    }
    assertTenantOwnership(ctx, employee.dealerId, 'Çalışan');

    await prisma.employee.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`${LOG_PREFIX} DELETE Error:`, error);
    return NextResponse.json({ error: error?.message || 'Çalışan silinemedi.' }, { status: error?.statusCode || 500 });
  }
}

