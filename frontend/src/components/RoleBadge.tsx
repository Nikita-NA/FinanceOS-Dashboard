import { Badge } from '@/components/ui/badge';
import type { Role, UserStatus } from '@/types';

const roleVariant: Record<Role, 'default' | 'secondary' | 'success' | 'destructive' | 'warning'> = {
  ADMIN: 'destructive',
  ANALYST: 'default',
  VIEWER: 'secondary',
};

export function RoleBadge({ role }: { role: Role }) {
  return <Badge variant={roleVariant[role]}>{role}</Badge>;
}

const statusVariant: Record<UserStatus, 'success' | 'secondary' | 'destructive'> = {
  ACTIVE: 'success',
  INACTIVE: 'destructive',
};

export function StatusBadge({ status }: { status: UserStatus }) {
  return <Badge variant={statusVariant[status]}>{status}</Badge>;
}
