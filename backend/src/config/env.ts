import dotenv from 'dotenv';

dotenv.config();

export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable is required in production');
    }
    return 'local_dev_jwt_secret_not_for_production';
  }
  return secret;
};

export const validateProductionEnv = () => {
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required in production');
    }
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required in production');
    }
    if (process.env.STORAGE_DRIVER === 'cloudinary') {
      if (!process.env.CLOUDINARY_CLOUD_NAME) {
        throw new Error('CLOUDINARY_CLOUD_NAME is required when STORAGE_DRIVER=cloudinary');
      }
      if (!process.env.CLOUDINARY_API_KEY) {
        throw new Error('CLOUDINARY_API_KEY is required when STORAGE_DRIVER=cloudinary');
      }
      if (!process.env.CLOUDINARY_API_SECRET) {
        throw new Error('CLOUDINARY_API_SECRET is required when STORAGE_DRIVER=cloudinary');
      }
    }
  }
};
