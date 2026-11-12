'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  GraduationCap,
  LockKeyhole,
  ShoppingCart,
  Sparkles,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        router.push('/dashboard');
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || 'Não foi possível entrar. Confira seus dados e tente novamente.');
      }
    } catch {
      setError('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page flex min-h-screen items-center justify-center p-4 py-8 sm:p-8">
      <div className="login-card grid w-full max-w-5xl overflow-hidden rounded-[2rem] md:grid-cols-2">
        <section className="login-brand-panel relative flex min-h-64 flex-col justify-between overflow-hidden p-7 sm:p-10 md:min-h-[680px]">
          <div className="absolute -bottom-24 -right-20 h-72 w-72 rounded-full border border-emerald-100/10" />
          <div className="absolute -bottom-12 -right-8 h-48 w-48 rounded-full border border-emerald-100/10" />

          <div className="relative">
            <div className="mb-10 flex items-center gap-3 md:mb-16">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-300 text-emerald-950 shadow-lg shadow-emerald-950/20">
                <ShoppingCart className="h-6 w-6" />
              </span>
              <div>
                <p className="text-sm font-bold tracking-wide text-white">CANTINA ESCOLAR</p>
                <p className="text-xs text-emerald-100/65">GESTÃO PRO</p>
              </div>
            </div>

            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-100/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-emerald-100">
              <Sparkles className="h-3.5 w-3.5" />
              Organização para o dia a dia
            </div>
            <h1 className="max-w-md text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">
              Uma cantina mais simples de gerenciar.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-emerald-50/70 sm:text-base">
              Acompanhe vendas, produtos e alunos em um só lugar, com tudo pronto para a rotina da sua escola.
            </p>
          </div>

          <div className="relative mt-8 hidden space-y-4 md:block">
            <div className="flex items-center gap-3 text-sm text-emerald-50/85">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-300/15 text-emerald-200">
                <Check className="h-4 w-4" />
              </span>
              Vendas e estoque organizados
            </div>
            <div className="flex items-center gap-3 text-sm text-emerald-50/85">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-300/15 text-emerald-200">
                <Check className="h-4 w-4" />
              </span>
              Acesso para gestores e operadores
            </div>
            <p className="pt-6 text-xs text-emerald-100/45">Um sistema feito para sua comunidade escolar.</p>
          </div>
        </section>

        <section className="flex flex-col justify-center p-7 sm:p-10 md:p-12">
          <div className="mb-8">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/15 bg-emerald-300/10 text-emerald-300 md:hidden">
              <GraduationCap className="h-6 w-6" />
            </div>
            <p className="mb-2 text-sm font-semibold text-emerald-300">Bem-vindo de volta</p>
            <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Acesse sua conta</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Entre com seu e-mail e senha para continuar.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm leading-5 text-rose-200"
              >
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-200">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                placeholder="seu@email.com"
                className="login-input h-12 w-full rounded-xl px-4 text-sm text-white placeholder:text-slate-500"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-slate-200">
                  Senha
                </label>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Digite sua senha"
                  className="login-input h-12 w-full rounded-xl px-4 pr-12 text-sm text-white placeholder:text-slate-500"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400 transition hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 font-semibold text-emerald-950 shadow-lg shadow-emerald-950/20 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Entrando...' : 'Entrar'}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <div className="my-7 flex items-center gap-3 text-xs text-slate-500">
            <span className="h-px flex-1 bg-white/10" />
            <span>ACESSO DE DEMONSTRAÇÃO</span>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
              <LockKeyhole className="h-3.5 w-3.5 text-emerald-300" />
              Credenciais para testar
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex flex-wrap justify-between gap-x-3 gap-y-1">
                <span className="text-slate-400">Gestor</span>
                <span className="font-mono text-slate-200">gestor@cantina.com · manager123</span>
              </div>
              <div className="flex flex-wrap justify-between gap-x-3 gap-y-1">
                <span className="text-slate-400">Operador</span>
                <span className="font-mono text-slate-200">operador1@cantina.com · operator123</span>
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            Acesso protegido para a equipe da sua escola.
          </p>
        </section>
      </div>
    </main>
  );
}
