import { useQuery } from '@tanstack/react-query';
import { fetchProfile } from '@/api/auth';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RoleBadge, StatusBadge } from '@/components/RoleBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/utils/formatDate';

export function ProfilePage() {
  const { setUser } = useAuth();
  const q = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const u = await fetchProfile();
      setUser(u);
      return u;
    },
  });

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-slate-500">Your account details</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Information from your session</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {q.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-6 w-64" />
            </div>
          ) : q.isError ? (
            <p className="text-sm text-red-600">Could not refresh profile.</p>
          ) : q.data ? (
            <>
              <div>
                <p className="text-xs font-medium uppercase text-slate-500">Name</p>
                <p className="text-lg font-semibold text-slate-900">{q.data.name}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-slate-500">Email</p>
                <p className="text-slate-800">{q.data.email}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <p className="text-xs font-medium uppercase text-slate-500">Role</p>
                  <div className="mt-1">
                    <RoleBadge role={q.data.role} />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-slate-500">Status</p>
                  <div className="mt-1">
                    <StatusBadge status={q.data.status} />
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-slate-500">Member since</p>
                <p className="text-slate-700">{formatDateTime(q.data.createdAt)}</p>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
