import axios from 'axios';

type ApiErrorPayload = {
  code?: string;
  title?: string;
  detail?: string;
  message?: string;
  errors?: string[] | Record<string, string[]>;
};

const exactTranslations: Record<string, string> = {
  'Email does not match the user': 'O e-mail informado não corresponde ao usuário.',
  'User not found': 'Usuário não encontrado.',
  'Name is required.': 'O nome é obrigatório.',
  'Name must not exceed 100 characters.': 'O nome não pode exceder 100 caracteres.',
  'Description must not exceed 500 characters.': 'A descrição não pode exceder 500 caracteres.',
  'Passwords must have at least one non alphanumeric character.': 'A senha deve conter pelo menos um caractere especial.',
  "Passwords must have at least one uppercase ('A'-'Z').": 'A senha deve conter pelo menos uma letra maiúscula.',
};

function translateDynamicMessage(message: string) {
  const usernameMatch = message.match(/^Username '(.+)' is already taken\.$/i);
  if (usernameMatch) return `O nome de usuário “${usernameMatch[1]}” já está em uso.`;

  const emailMatch = message.match(/^User with email (.+) already exists\.$/i);
  if (emailMatch) return `Já existe um usuário cadastrado com o e-mail ${emailMatch[1]}.`;

  return null;
}

export function normalizeApiMessage(message: string) {
  return message
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const translated = exactTranslations[item] ?? translateDynamicMessage(item) ?? item;
      return translated
        .replaceAll('Categória', 'Categoria')
        .replaceAll('categória', 'categoria')
        .replaceAll('categórias', 'categorias')
        .replaceAll('deletar', 'excluir');
    })
    .filter((item, index, items) => items.indexOf(item) === index)
    .join('\n');
}

function getPayloadMessage(payload: ApiErrorPayload | string | undefined) {
  if (!payload) return null;
  if (typeof payload === 'string') return payload;

  const validationErrors = Array.isArray(payload.errors)
    ? payload.errors
    : payload.errors
      ? Object.values(payload.errors).flat()
      : [];

  const parts = [payload.detail, payload.message, ...validationErrors].filter(
    (value): value is string => Boolean(value?.trim()),
  );

  return parts.length > 0 ? parts.join(' | ') : payload.title ?? null;
}

export function getApiErrorMessage(error: unknown, fallback = 'Não foi possível concluir a operação.') {
  if (!axios.isAxiosError<ApiErrorPayload | string>(error)) return fallback;

  const backendMessage = getPayloadMessage(error.response?.data);
  if (backendMessage) return normalizeApiMessage(backendMessage);

  if (error.code === 'ECONNABORTED') {
    return 'O servidor demorou para responder. Tente novamente em instantes.';
  }

  if (!error.response) {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão.';
  }

  switch (error.response.status) {
    case 400:
    case 422:
      return 'Verifique os dados informados e tente novamente.';
    case 401:
      return 'Sua sessão expirou ou você não está autenticado.';
    case 403:
      return 'Você não tem permissão para realizar esta operação.';
    case 404:
      return 'O registro solicitado não foi encontrado.';
    case 409:
      return 'Não foi possível concluir porque já existe um registro com esses dados.';
    case 413:
      return 'O arquivo enviado excede o tamanho permitido.';
    case 429:
      return 'Muitas solicitações foram realizadas. Aguarde e tente novamente.';
    default:
      return error.response.status >= 500
        ? 'O servidor encontrou um problema. Tente novamente em instantes.'
        : fallback;
  }
}
