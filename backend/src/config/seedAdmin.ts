import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

export const seedDefaultAdmin = async () => {
  try {
    const adminEmail = 'admin@efootball.com';
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash('admin123', 10);
      await prisma.user.create({
        data: {
          email: adminEmail,
          passwordHash,
          name: 'Admin Coordinator',
        },
      });
      console.log('✅ Default demo admin account created: admin@efootball.com / admin123');
    }
  } catch (error) {
    console.error('Failed to seed admin account:', error);
  }
};
