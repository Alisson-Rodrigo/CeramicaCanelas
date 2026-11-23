import axios from 'axios';
import { NextResponse } from 'next/server';
import { api } from '@/lib/api';
import { normalizeApiMessage } from '@/lib/api-error';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string };
    const email = body.email?.trim();
    if (!email) return NextResponse.json({ message: 'Informe seu e-mail cadastrado.' }, { status: 400 });

    await api.post('/api/auth/forgot-password', null, { params: { email }, timeout: 20000 });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (!axios.isAxiosError(error)) return NextResponse.json({ message: 'Não foi possível processar a solicitação.' }, { status: 500 });

    const rawMessage = (error.response?.data as { message?: string } | undefined)?.message;
    const message = rawMessage ? normalizeApiMessage(rawMessage) : undefined;
    if (!error.response || error.code === 'ECONNABORTED') {
      return NextResponse.json({ message: 'Não foi possível conectar ao serviço de e-mail. Tente novamente mais tarde.' }, { status: 503 });
    }
    return NextResponse.json({ message: message ?? 'Não foi possível enviar o link de recuperação. Verifique a configuração de e-mail e tente novamente.' }, { status: error.response.status >= 500 ? 503 : error.response.status });
  }
}
