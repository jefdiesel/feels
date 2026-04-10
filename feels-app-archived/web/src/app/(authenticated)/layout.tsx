import { AuthGuard } from '@/components/AuthGuard';
import { Navigation } from '@/components/Navigation';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <Navigation />
        <div className="flex-1 pb-20 lg:ml-20 lg:pb-0">
          {children}
        </div>
      </div>
    </AuthGuard>
  );
}
