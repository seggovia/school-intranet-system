import axios from 'axios';

export type ApiErrorKind = 'validation' | 'unauthorized' | 'forbidden' | 'not_found' | 'conflict' | 'server' | 'unknown';

export type NormalizedApiError = {
  kind: ApiErrorKind;
  status?: number;
  title: string;
  message: string;
  solution?: string;
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

function normalizeText(value = '') {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function conflictCopy(message?: string) {
  const text = normalizeText(message);
  if (text.includes('horario') || text.includes('choque') || text.includes('ocupada')) {
    return {
      title: 'Horario no disponible',
      solution: 'Ajusta el dia, la hora, la sala, la seccion o el profesor y vuelve a intentarlo.'
    };
  }
  if (text.includes('estudiante ya esta asignado')) {
    return {
      title: 'El estudiante ya tiene seccion',
      solution: 'Quita la seccion actual del estudiante antes de asignarlo a una nueva.'
    };
  }
  if (text.includes('no se puede eliminar')) {
    return {
      title: 'No se puede eliminar este registro',
      solution: 'Quita primero las relaciones asociadas y luego intenta eliminarlo nuevamente.'
    };
  }
  if (text.includes('no se puede desactivar')) {
    return {
      title: 'No se puede desactivar este registro',
      solution: 'Revisa las relaciones activas asociadas al registro antes de desactivarlo.'
    };
  }
  if (text.includes('ya existe') || text.includes('duplic')) {
    return {
      title: 'El registro ya existe',
      solution: 'Usa datos distintos o edita el registro existente.'
    };
  }
  if (text.includes('cerrado') || text.includes('ya no')) {
    return {
      title: 'La accion ya no esta disponible',
      solution: 'Revisa el estado actual del registro antes de continuar.'
    };
  }
  return {
    title: 'No se pudo completar la operacion',
    solution: 'Revisa los datos relacionados y vuelve a intentarlo.'
  };
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
      solution: 'Intenta nuevamente en unos segundos.',
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
      solution: Object.keys(fieldErrors).length ? 'Corrige los campos marcados y vuelve a guardar.' : 'Revisa la informacion ingresada y vuelve a intentarlo.',
      fieldErrors
    };
  }
  if (status === 401) {
    return {
      kind: 'unauthorized',
      status,
      title: 'Sesion expirada',
      message: 'Tu sesion expiro. Vuelve a iniciar sesion.',
      solution: 'Te redirigiremos al inicio de sesion para continuar.',
      fieldErrors: {}
    };
  }
  if (status === 403) {
    return {
      kind: 'forbidden',
      status,
      title: 'Accion no permitida',
      message: 'No tienes permisos para realizar esta accion.',
      solution: 'Si necesitas acceder, solicita permisos a un administrador.',
      fieldErrors: {}
    };
  }
  if (status === 404) {
    return {
      kind: 'not_found',
      status,
      title: 'Recurso no encontrado',
      message: backendMessage ?? 'El recurso solicitado no existe o ya no esta disponible.',
      solution: 'Actualiza la pagina o vuelve a buscar el registro.',
      fieldErrors: {}
    };
  }
  if (status === 409) {
    const copy = conflictCopy(backendMessage);
    return {
      kind: 'conflict',
      status,
      title: copy.title,
      message: backendMessage ?? 'La operacion entra en conflicto con un registro existente.',
      solution: copy.solution,
      fieldErrors: {}
    };
  }
  if (status && status >= 500) {
    return {
      kind: 'server',
      status,
      title: 'Error inesperado',
      message: 'Ocurrio un problema. Intenta nuevamente.',
      solution: 'Si el problema continua, recarga la pagina o contacta soporte.',
      fieldErrors: {}
    };
  }

  return {
    kind: 'unknown',
    status,
    title: 'Error inesperado',
    message: backendMessage ?? 'Ocurrio un problema. Intenta nuevamente.',
    solution: 'Intenta nuevamente en unos segundos.',
    fieldErrors: {}
  };
}

export function shouldShowApiErrorModal(error: NormalizedApiError) {
  return ['unauthorized', 'forbidden', 'not_found', 'conflict', 'server', 'unknown'].includes(error.kind);
}
