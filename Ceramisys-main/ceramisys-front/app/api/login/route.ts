import axios from 'axios';
import { NextResponse } from 'next/server';
import { api } from '@/lib/api';
import { normalizeApiMessage } from '@/lib/api-error';

type LoginBody = {
  username?: string;
  password?: string;
};

type AuthResponse = {
  accessToken?: string;
  expirationDate?: string;
};

type ApiErrorResponse = {
  message?: string;
};

export async function POST(request: Request) {
  try {
    const { username, password } = (await request.json()) as LoginBody;

    if (!username?.trim() || !password) {
      return NextResponse.json(
        { message: 'Informe o usuário e a senha para continuar.' },
        { status: 400 },
      );
    }

    const authResponse = await api.post<AuthResponse>('/api/auth', null, {
      params: {
        Username: username,
        Password: password,
      },
      timeout: 10000,
    });

    const { accessToken, expirationDate } = authResponse.data;

    if (!accessToken) {
      return NextResponse.json(
        { message: 'Não foi possível iniciar sua sessão. Tente novamente.' },
        { status: 502 },
      );
    }

    const response = NextResponse.json({ success: true });
    const parsedExpiration = expirationDate ? new Date(expirationDate) : null;
    const hasValidExpiration =
      parsedExpiration !== null && !Number.isNaN(parsedExpiration.getTime());

    response.cookies.set({
      name: 'auth_token',
      value: accessToken,
      // O front atual lê o token para montar o header Authorization.
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      ...(hasValidExpiration ? { expires: parsedExpiration } : {}),
    });

    return response;
  } catch (error: unknown) {
    if (!axios.isAxiosError(error)) {
      return NextResponse.json(
        { message: 'Não foi possível processar o login. Tente novamente.' },
        { status: 500 },
      );
    }

    const status = error.response?.status;
    const backendData = error.response?.data as ApiErrorResponse | undefined;
    const backendMessage = backendData?.message
      ? normalizeApiMessage(backendData.message)
      : null;

    if (status === 400 || status === 401 || status === 404) {
      return NextResponse.json(
        { message: backendMessage ?? 'Usuário ou senha inválidos.' },
        { status: 401 },
      );
    }

    if (status === 403) {
      return NextResponse.json(
        { message: backendMessage ?? 'Seu acesso está bloqueado ou inativo. Procure um administrador.' },
        { status: 403 },
      );
    }

    if (status === 429) {
      return NextResponse.json(
        { message: backendMessage ?? 'Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente.' },
        { status: 429 },
      );
    }

    if (!error.response || error.code === 'ECONNABORTED') {
      return NextResponse.json(
        { message: 'O servidor está demorando para responder. Tente novamente em instantes.' },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { message: 'O serviço de login está temporariamente indisponível.' },
      { status: 503 },
    );
  }
}
