import bcrypt from 'bcryptjs';
import { HttpError } from '../../shared/http-error.js';
import { UserRepository } from './user.repository.js';
import type { CreateUserInput, UpdateUserInput } from './user.validators.js';

const repository = new UserRepository();

type UserWithRoles = NonNullable<Awaited<ReturnType<UserRepository['findById']>>>;

function toPublicUser(user: UserWithRoles) {
  const roles = user.roles.map((item) => item.role.name);
  const permissions = [...new Set(user.roles.flatMap((item) => item.role.permissions.map((permission) => permission.permission.key)))];

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    department: user.department,
    roles,
    primaryRole: roles[0] ?? 'student',
    permissions,
    isActive: user.isActive
  };
}

export class UserService {
  async me(id: string) {
    const user = await repository.findById(id);
    if (!user) throw new HttpError(404, 'Usuario no encontrado.');
    return toPublicUser(user);
  }

  async list() {
    const users = await repository.listUsers();
    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      department: user.department,
      roles: user.roles.map((item) => item.role.name),
      isActive: user.isActive
    }));
  }

  async create(input: CreateUserInput) {
    const existing = await repository.findByEmail(input.email);
    if (existing) {
      throw new HttpError(409, 'Ya existe un usuario con ese correo.');
    }

    const roles = await repository.findRolesByNames(input.roles);
    if (roles.length !== input.roles.length) {
      throw new HttpError(400, 'Uno o mas roles no existen.');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await repository.createUser({
      name: input.name,
      email: input.email,
      passwordHash,
      avatar: input.avatar,
      department: input.department,
      roleIds: roles.map((role) => role.id)
    });

    return toPublicUser(user);
  }

  async update(id: string, input: UpdateUserInput) {
    const current = await repository.findById(id);
    if (!current) {
      throw new HttpError(404, 'Usuario no encontrado.');
    }

    if (input.email && input.email !== current.email) {
      const existing = await repository.findByEmail(input.email);
      if (existing) {
        throw new HttpError(409, 'Ya existe un usuario con ese correo.');
      }
    }

    const passwordHash = input.password ? await bcrypt.hash(input.password, 12) : undefined;
    const user = await repository.updateUser(id, {
      name: input.name,
      email: input.email,
      avatar: input.avatar,
      department: input.department,
      passwordHash
    });

    return toPublicUser(user);
  }

  async updateRoles(id: string, roleNames: string[]) {
    const current = await repository.findById(id);
    if (!current) {
      throw new HttpError(404, 'Usuario no encontrado.');
    }

    const roles = await repository.findRolesByNames(roleNames);
    if (roles.length !== roleNames.length) {
      throw new HttpError(400, 'Uno o mas roles no existen.');
    }

    const user = await repository.replaceRoles(id, roles.map((role) => role.id));
    if (!user) {
      throw new HttpError(404, 'Usuario no encontrado.');
    }

    return toPublicUser(user);
  }

  async deactivate(id: string) {
    const current = await repository.findById(id);
    if (!current) {
      throw new HttpError(404, 'Usuario no encontrado.');
    }

    return toPublicUser(await repository.setActive(id, false));
  }

  async reactivate(id: string) {
    const current = await repository.findById(id);
    if (!current) {
      throw new HttpError(404, 'Usuario no encontrado.');
    }

    return toPublicUser(await repository.setActive(id, true));
  }
}
