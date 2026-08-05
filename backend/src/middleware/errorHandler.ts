import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Server Error:', err);

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'An unexpected error occurred';

  return res.status(statusCode).json({
    error: message,
  });
};
