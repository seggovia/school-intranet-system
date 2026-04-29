import axios from 'axios';

export type ApiErrorKind = 'validation' | 'unauthorized' | 'forbidden' | 'not_found' | 'conflict' | 'server' | 'unknown';

export type NormalizedApiError = {
  kind: ApiErrorKind;
  status?: number;
  title: string;
  message: string;
  fieldErrors: Record<string, string>;
};

type ErrorDetails = {
  fieldErrors?: Record<string, string[]>;
  formErrors?: string[];
};

function firstFieldErrors(details: unknown) {
  const source = details as ErrorDetails | undefined;
  const entries = Object.entries(source?.fieldErrors ?? {});
  return Object.fromEntries(entries.map(([field, messages]) => [field, messages[0] ?? 'Campo invalido']));
}

export function normalizeApiError(error: unknown): NormalizedApiError {
  if (error && typeof error === 'object' && 'kind' in error && 'title' in error && 'message' in error) {
    return error as NormalizedApiError;
  }

  if (!axios.isAxiosError(error)) {
    return {
      kind: 'unknown',
      title: 'Error inesperado',
      message: error instanceof Error && error.message ? error.message : 'Ocurrio un problema. Intenta nuevamente.',
      fieldErrors: {}
    };
  }

  const status = error.response?.status;
  const data = error.response?.data as { message?: string; details?: unknown } | undefined;
  const backendMessage = data?.message;
  const fieldErrors = firstFieldErrors(data?.details);

  if (status === 400) {
    return {
      kind: 'validation',
      status,
      title: 'Datos invalidos',
      message: backendMessage ?? 'Revisa los campos del formulario.',
      fieldErrors
    };
  }
  if (status === 401) {
    return {
      kind: 'unauthorized',
      status,
      title: 'Sesion expirada',
      message: 'Tu sesion expiro. Vuelve a iniciar sesion.',
      fieldErrors: {}
    };
  }
  if (status === 403) {
    return {
      kind: 'forbidden',
      status,
      title: 'Accion no permitida',
      message: 'No tienes permisos para realizar esta accion.',
      fieldErrors: {}
    };
  }
  if (status === 404) {
    return {
      kind: 'not_found',
      status,
      title: 'Recurso no encontrado',
      message: backendMessage ?? 'El recurso solicitado no existe o ya no esta disponible.',
      fieldErrors: {}
    };
  }
  if (status === 409) {
    return {
      kind: 'conflict',
      status,
      title: 'Conflicto detectado',
      message: backendMessage ?? 'La operacion entra en conflicto con un registro existente.',
      fieldErrors: {}
    };
  }
  if (status && status >= 500) {
    return {
      kind: 'server',
      status,
      title: 'Error inesperado',
      message: 'Ocurrio un problema. Intenta nuevamente.',
      fieldErrors: {}
    };
  }

  return {
    kind: 'unknown',
    status,
    title: 'Error inesperado',
    message: backendMessage ?? 'Ocurrio un problema. Intenta nuevamente.',
    fieldErrors: {}
  };
}

export function shouldShowApiErrorModal(error: NormalizedApiError) {
  return ['unauthorized', 'forbidden', 'not_found', 'conflict', 'server', 'unknown'].includes(error.kind);
}
