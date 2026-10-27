import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getApiErrorMessage } from '../../api/client';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { School, LogIn, GraduationCap, Users, Shield, Briefcase, Lock } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid university email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    try {
      const user = await login(values);
      success(`Welcome back, ${user.firstName}! Signed in as ${user.role.replace('_', ' ')}.`);
      navigate(from, { replace: true });
    } catch (err) {
      toastError(getApiErrorMessage(err), 'Authentication Failed');
    } finally {
      setIsLoading(false);
    }
  };

  const fillQuickDemo = (email: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', 'Password@123', { shouldValidate: true });
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-600/20 mb-3">
          <School className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Departmental Management System
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Faculty of Engineering & Technology • Dept. of Computer Science
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-200/80">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="University Email"
              type="email"
              placeholder="e.g. student.rahul@university.edu"
              autoComplete="email"
              error={errors.email?.message}
              required
              {...register('email')}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••••••"
              autoComplete="current-password"
              error={errors.password?.message}
              required
              {...register('password')}
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isLoading}
                className="w-full font-semibold shadow-md"
                leftIcon={<LogIn className="w-4 h-4" />}
              >
                Sign In to Department Portal
              </Button>
            </div>
          </form>

          {/* Quick Demo Credentials Switcher */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-2.5">
              <Lock className="w-3.5 h-3.5 text-indigo-600" />
              <span>Demo Quick-Fill Roles (Development / Testing):</span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Click any role below to prefill credentials (seeded password: <code>Password@123</code>):
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillQuickDemo('student.rahul@university.edu')}
                className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:bg-indigo-50/60 hover:border-indigo-200 transition text-left"
              >
                <GraduationCap className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="overflow-hidden">
                  <p className="font-semibold text-slate-800 text-[11px] truncate">Student</p>
                  <p className="text-[10px] text-slate-400 truncate">Rahul Verma (UG)</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => fillQuickDemo('prof.sharma@university.edu')}
                className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:bg-indigo-50/60 hover:border-indigo-200 transition text-left"
              >
                <Briefcase className="w-4 h-4 text-indigo-600 shrink-0" />
                <div className="overflow-hidden">
                  <p className="font-semibold text-slate-800 text-[11px] truncate">Faculty</p>
                  <p className="text-[10px] text-slate-400 truncate">Prof. V. Sharma</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => fillQuickDemo('hod.cse@university.edu')}
                className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:bg-indigo-50/60 hover:border-indigo-200 transition text-left"
              >
                <Users className="w-4 h-4 text-purple-600 shrink-0" />
                <div className="overflow-hidden">
                  <p className="font-semibold text-slate-800 text-[11px] truncate">HOD</p>
                  <p className="text-[10px] text-slate-400 truncate">Dr. R. Mukherjee</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => fillQuickDemo('admin.cse@university.edu')}
                className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:bg-indigo-50/60 hover:border-indigo-200 transition text-left"
              >
                <Shield className="w-4 h-4 text-amber-600 shrink-0" />
                <div className="overflow-hidden">
                  <p className="font-semibold text-slate-800 text-[11px] truncate">Dept Admin</p>
                  <p className="text-[10px] text-slate-400 truncate">CSE Admin Office</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Protected by role-based departmental access policies & Argon2 security.
        </p>
      </div>
    </div>
  );
};
