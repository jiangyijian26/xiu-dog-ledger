export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function notFound(_req, _res, next) {
  next(new HttpError(404, '接口不存在'));
}

export function errorHandler(error, _req, res, _next) {
  if (error?.name === 'ZodError') {
    return res.status(400).json({ message: '请求参数不正确', details: error.issues });
  }

  const status = error.status || 500;
  const message = status === 500 ? '服务器内部错误' : error.message;
  if (status === 500) {
    console.error(error);
  }
  res.status(status).json({ message });
}
