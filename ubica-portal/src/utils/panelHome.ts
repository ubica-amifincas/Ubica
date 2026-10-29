/** Página de inicio del panel privado de cada rol. */
export function panelHome(role?: string | null): string {
  switch (role) {
    case 'admin': return '/admin';
    case 'realtor': return '/realtor';
    case 'investor': return '/investor';
    default: return '/dashboard';
  }
}
