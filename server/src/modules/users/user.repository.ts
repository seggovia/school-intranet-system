import { prisma } from '../../config/db.js';

const userInclude = {
  roles: {
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true }
          }
        }
      }
    }
  }
};

export class UserRepository {
  listUsers() {
    return prisma.user.findMany({
      include: { roles: { include: { role: true } } },
      orderBy: { name: 'asc' }
    });
  }

  findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: userInclude
    });
  }

  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }

  findRolesByNames(names: string[]) {
    return prisma.role.findMany({ where: { name: { in: names } } });
  }

  createUser(input: {
    name: string;
    email: string;
    passwordHash: string;
    avatar: string;
    department: string;
    roleIds: string[];
  }) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash: input.passwordHash,
          avatar: input.avatar,
          department: input.department,
          roles: {
            create: input.roleIds.map((roleId) => ({ roleId }))
          }
        },
        include: userInclude
      });

      return user;
    });
  }

  updateUser(id: string, input: Partial<{ name: string; email: string; passwordHash: string; avatar: string; department: string }>) {
    return prisma.user.update({
      where: { id },
      data: input,
      include: userInclude
    });
  }

  replaceRoles(userId: string, roleIds: string[]) {
    return prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId } });
      await tx.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId, roleId })),
        skipDuplicates: true
      });

      return tx.user.findUnique({
        where: { id: userId },
        include: userInclude
      });
    });
  }

  setActive(id: string, isActive: boolean) {
    return prisma.user.update({
      where: { id },
      data: { isActive },
      include: userInclude
    });
  }
}
