export class ApiError extends Error {
  constructor(code, message, status = 500, options = {}) {
    super(message, options);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

export const toErrorResponse = (error) => {
  if (error instanceof ApiError) {
    return {
      status: error.status,
      body: { error: { code: error.code, message: error.message } },
    };
  }

  return {
    status: 500,
    body: {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'The SkyWings server could not complete the request.',
      },
    },
  };
};
