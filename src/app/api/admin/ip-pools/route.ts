import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { restCall } from '@/lib/mikrotik';

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'superadmin')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const routerId = searchParams.get('routerId');
  if (!routerId) return NextResponse.json({ error: 'Router ID is required' }, { status: 400 });
  try {
    const pools = await restCall(Number(routerId), 'GET', '/ip/pool');
    return NextResponse.json({ success: true, pools });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'superadmin')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { routerId, name, ranges } = await req.json();
    if (!routerId || !name || !ranges) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    await restCall(Number(routerId), 'PUT', '/ip/pool', { name, ranges });
    return NextResponse.json({ success: true, message: 'IP Pool created successfully' });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'superadmin')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const routerId = searchParams.get('routerId');
  const poolId = searchParams.get('poolId');
  if (!routerId || !poolId) return NextResponse.json({ error: 'Router ID and Pool ID are required' }, { status: 400 });
  try {
    await restCall(Number(routerId), 'POST', '/ip/pool/remove', { '.id': poolId });
    return NextResponse.json({ success: true, message: 'IP Pool deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
