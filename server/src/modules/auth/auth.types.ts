export interface JwtUser {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  department: string;
  roles: string[];
  primaryRole: string;
  permissions: string[];
}
