import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateAiResponse, AiChatMessage } from '@/lib/ai-engine';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dealerId = (session.user as any)?.dealerId || 'merkez';
    const body = await req.json();
    const { messages } = body as { messages: AiChatMessage[] };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Geçersiz mesaj içeriği.' }, { status: 400 });
    }

    const aiAnswer = await generateAiResponse(dealerId, messages);

    return NextResponse.json({
      role: 'assistant',
      content: aiAnswer,
    });
  } catch (error: any) {
    console.error('[AI Chat Error]:', error);
    return NextResponse.json({
      error: error.message || 'Yapay Zeka yanıt üretemedi.',
    }, { status: 500 });
  }
}
