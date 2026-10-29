import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  UserPlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { useAuthenticatedFetch } from '../../contexts/AuthContext';
import type { CreateUserRequest, UpdateUserRequest } from '../../services/apiService';
import type { User } from '../../services/apiService';
import {
  PageHeader,
  PageStack,
  Section,
  EmptyState,
  LoadingState,
  Badge,
  Table,
  THead,
  TBody,
  Th,
  Tr,
  Td,
  buttonClass,
  iconButtonClass,
  type BadgeTone,
} from '../dashboard/ui';

interface UserFormData {
  email: string;
  password: string;
  full_name: string;
  role: 'admin' | 'realtor' | 'investor' | 'user';
  company: string;
  phone: string;
}

const ROLES: { value: string; label: string; tone: BadgeTone }[] = [
  { value: 'admin', label: 'Administrador', tone: 'warning' },
  { value: 'realtor', label: 'Inmobiliaria', tone: 'brand' },
  { value: 'investor', label: 'Inversionista', tone: 'brand' },
  { value: 'user', label: 'Usuario', tone: 'neutral' },
];

const inputClass =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    password: '',
    full_name: '',
    role: 'user',
    company: '',
    phone: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const apiService = useAuthenticatedFetch();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const usersData = await apiService.getAllUsers();
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setFormData({
      email: '',
      password: '',
      full_name: '',
      role: 'user',
      company: '',
      phone: '',
    });
    setErrors({});
    setShowModal(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: '', // No mostrar contraseña actual
      full_name: user.full_name,
      role: user.role as any,
      company: user.company || '',
      phone: user.phone || '',
    });
    setErrors({});
    setShowModal(true);
  };

  const handleDeleteUser = async (user: User) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar al usuario ${user.full_name}?`)) {
      try {
        await apiService.deleteUser(user.id);
        await fetchUsers();
      } catch (error: any) {
        alert(`Error: ${error.message}`);
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!editingUser && !formData.password) {
      newErrors.password = 'La contraseña es requerida';
    }

    if (!formData.full_name) {
      newErrors.full_name = 'El nombre completo es requerido';
    }

    if (!formData.role) {
      newErrors.role = 'El rol es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      if (editingUser) {
        // Actualizar usuario
        const updateData: UpdateUserRequest = {
          email: formData.email,
          full_name: formData.full_name,
          role: formData.role,
          company: formData.company || undefined,
          phone: formData.phone || undefined,
          ...(formData.password ? { password: formData.password } : {})
        };
        await apiService.updateUser(editingUser.id, updateData);
      } else {
        // Crear usuario
        const createData: CreateUserRequest = {
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          role: formData.role,
          company: formData.company || undefined,
          phone: formData.phone || undefined,
        };
        await apiService.createUser(createData);
      }

      setShowModal(false);
      await fetchUsers();
    } catch (error: any) {
      setErrors({ submit: error.message });
    }
  };

  const approveRealtor = async (user: User) => {
    try {
      await apiService.updateUser(user.id, { is_approved: true });
      setUsers(prev => prev.map(u => (u.id === user.id ? { ...u, is_approved: true } : u)));
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const pendingRealtors = users.filter(u => u.role === 'realtor' && u.is_approved === false).length;

  const getRoleInfo = (role: string) => {
    return ROLES.find(r => r.value === role) || ROLES[3];
  };

  const header = (
    <PageHeader
      title="Usuarios"
      description="Administra los accesos y roles de la plataforma"
      actions={
        <button type="button" onClick={handleCreateUser} className={buttonClass.primary}>
          <UserPlusIcon className="h-5 w-5" />
          Nuevo usuario
        </button>
      }
    />
  );

  if (loading) {
    return (
      <PageStack>
        {header}
        <LoadingState />
      </PageStack>
    );
  }

  return (
    <PageStack>
      {header}

      <Section
        title="Cuentas"
        actions={
          <span className="text-sm tabular-nums text-gray-500 dark:text-gray-400">
            {users.length} {users.length === 1 ? 'usuario' : 'usuarios'}
            {pendingRealtors > 0 && ` · ${pendingRealtors} ${pendingRealtors === 1 ? 'inmobiliaria pendiente' : 'inmobiliarias pendientes'} de aprobar`}
          </span>
        }
        flush
      >
        {users.length === 0 ? (
          <EmptyState bare icon={UsersIcon} title="Todavía no hay usuarios registrados." />
        ) : (
          <Table>
            <THead>
              <tr>
                <Th>Usuario</Th>
                <Th>Rol</Th>
                <Th>Empresa</Th>
                <Th>Estado</Th>
                <Th align="right">Acciones</Th>
              </tr>
            </THead>
            <TBody>
              {users.map((user) => {
                const roleInfo = getRoleInfo(user.role);
                return (
                  <Tr key={user.id}>
                    <Td>
                      <div className="font-medium text-gray-900 dark:text-white">{user.full_name}</div>
                      <div className="text-gray-500 dark:text-gray-400">{user.email}</div>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={roleInfo.tone}>{roleInfo.label}</Badge>
                        {/* Se dio de alta como inmobiliaria: sus anuncios pasan revisión hasta aprobarla */}
                        {user.role === 'realtor' && user.is_approved === false && (
                          <>
                            <Badge tone="warning">Sin aprobar</Badge>
                            <button type="button" onClick={() => approveRealtor(user)}
                              className="rounded-md px-2 py-0.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-900/30">
                              Aprobar
                            </button>
                          </>
                        )}
                      </div>
                    </Td>
                    <Td>{user.company || 'N/A'}</Td>
                    <Td>
                      <Badge tone={user.is_active ? 'brand' : 'danger'}>{user.is_active ? 'Activo' : 'Inactivo'}</Badge>
                    </Td>
                    <Td align="right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleEditUser(user)}
                          className={iconButtonClass.brand}
                          title="Editar"
                          aria-label={`Editar a ${user.full_name}`}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(user)}
                          className={iconButtonClass.danger}
                          title="Eliminar"
                          aria-label={`Eliminar a ${user.full_name}`}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        )}
      </Section>

      {/* Modal for Create/Edit User (en un portal: dentro de PageStack heredaría su margen superior) */}
      {showModal && createPortal(
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-gray-900/50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={editingUser ? 'Editar usuario' : 'Crear usuario'}
            className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-gray-900 dark:text-white">
                {editingUser ? 'Editar usuario' : 'Crear usuario'}
              </h3>
              <button type="button" onClick={() => setShowModal(false)} aria-label="Cerrar" className={iconButtonClass.neutral}>
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={inputClass}
                  placeholder="usuario@ejemplo.com"
                />
                {errors.email && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.email}</p>}
              </div>

              {/* Password (obligatorio al crear, opcional al editar) */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {editingUser ? 'Nueva contraseña (dejar en blanco para no cambiar)' : 'Contraseña *'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={inputClass}
                  placeholder="••••••••"
                />
                {errors.password && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.password}</p>}
              </div>

              {/* Full Name */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className={inputClass}
                  placeholder="Juan Pérez"
                />
                {errors.full_name && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.full_name}</p>}
              </div>

              {/* Role */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Rol *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className={inputClass}
                >
                  {ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
                {errors.role && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.role}</p>}
              </div>

              {/* Company */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Empresa
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className={inputClass}
                  placeholder="Empresa S.L."
                />
              </div>

              {/* Phone */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={inputClass}
                  placeholder="+34 xxx xxx xxx"
                />
              </div>

              {errors.submit && (
                <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className={`${buttonClass.secondary} flex-1`}>
                  Cancelar
                </button>
                <button type="submit" className={`${buttonClass.primary} flex-1`}>
                  {editingUser ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body,
      )}
    </PageStack>
  );
};

export default UserManagement;
