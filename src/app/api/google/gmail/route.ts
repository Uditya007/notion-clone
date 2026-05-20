import { NextResponse } from 'next/server';
import { getGoogleToken } from '@/lib/google-auth';

export async function GET() {
  const token = await getGoogleToken();
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized: Google Account Not Connected' }, { status: 401 });
  }

  try {
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&q=in:inbox', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error('Failed to fetch messages list');
    const data = await res.json();

    const messages = await Promise.all((data.messages || []).map(async (msg: any) => {
      try {
        const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date&metadataHeaders=Message-ID`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!msgRes.ok) return null;
        
        const msgData = await msgRes.json();
        const headers = msgData.payload?.headers || [];
        
        return {
          id: msgData.id,
          threadId: msgData.threadId,
          snippet: msgData.snippet,
          subject: headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject',
          from: headers.find((h: any) => h.name === 'From')?.value || 'Unknown',
          date: headers.find((h: any) => h.name === 'Date')?.value || '',
          messageId: headers.find((h: any) => h.name === 'Message-ID')?.value || '',
          labels: msgData.labelIds || [],
          isRead: !msgData.labelIds?.includes('UNREAD'),
          hasAttachment: msgData.payload?.mimeType === 'multipart/mixed'
        };
      } catch {
        return null;
      }
    }));

    return NextResponse.json(messages.filter(Boolean));
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const token = await getGoogleToken();
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized: Google Account Not Connected' }, { status: 401 });
  }

  try {
    const { to, subject, body, replyToMessageId, threadId } = await req.json();

    const emailLines = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset="UTF-8"',
    ];

    if (replyToMessageId) {
      emailLines.push(`In-Reply-To: ${replyToMessageId}`);
      emailLines.push(`References: ${replyToMessageId}`);
    }

    emailLines.push('');
    emailLines.push(body);

    const emailRaw = Buffer.from(emailLines.join('\n'))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw: emailRaw, threadId })
    });

    if (!res.ok) throw new Error('Failed to send email');
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 });
  }
}
