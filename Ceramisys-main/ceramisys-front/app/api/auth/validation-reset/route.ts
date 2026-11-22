import axios from 'axios';
import { NextResponse } from 'next/server';
import { api } from '@/lib/api';
import { normalizeApiMessage } from '@/lib/api-error';

type ResetRequest = { token?: string; password?: string; confirmPassword?: string };

export async function POST(request: Request) {
  try {
    const body = await request.json() as ResetRequest;
    if (!body.token || !body.password || !body.confirmPassword) {
      return NextResponse.json({ message: 'Preencha os campos para redefinir a senha.' }, { status: 400 });
    }

    await api.post('/api/auth/validation-reset', {
      token: body.token,
      password: body.password,
      confirmPassword: body.confirmPassword,
    }, { timeout: 15000 });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (!axios.isAxiosError(error)) return NextResponse.json({ message: 'Não foi possível processar a solicitação.' }, { status: 500 });

    const rawMessage = (error.response?.data as { message?: string } | undefined)?.message;
    const message = rawMessage ? normalizeApiMessage(rawMessage) : undefined;
    if (!error.response || error.code === 'ECONNABORTED') {
      return NextResponse.json({ message: 'Não foi possível conectar ao serviço de autenticação. Tente novamente.' }, { status: 503 });
    }
    return NextResponse.json({ message: message ?? 'Não foi possível redefinir a senha. Confira se o link ainda está válido.' }, { status: error.response.status >= 500 ? 503 : error.response.status });
  }
}
