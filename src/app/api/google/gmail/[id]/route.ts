import { NextResponse } from 'next/server';
import { getGoogleToken } from '@/lib/google-auth';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = await getGoogleToken();
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized: Google Account Not Connected' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error('Failed to fetch message details');
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch email details' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = await getGoogleToken();
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized: Google Account Not Connected' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { isRead } = await request.json();

    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}/modify`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        addLabelIds: isRead ? [] : ['UNREAD'],
        removeLabelIds: isRead ? ['UNREAD'] : []
      })
    });

    if (!res.ok) throw new Error('Failed to modify email labels');
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update email labels' }, { status: 500 });
  }
}
