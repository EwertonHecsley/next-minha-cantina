'use client';

import { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, Users, Package, BarChart3, Trash2, Phone, CheckCircle, UserPlus, LogOut, Menu, X, User, LoaderCircle, CircleAlert } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const formatCurrency = (value: number) => currencyFormatter.format(value);

interface Student {
  id: string;
  name: string;
  grade: string;
  parentName: string;
  parentPhone: string;
}

interface ApiProduct {
  id: string;
  name: string;
  priceInCents: number;
  stock: number;
  imageUrl: string | null;
}

interface Product extends ApiProduct {
  price: number;
}

interface CartItem extends Product {
  quantity: number;
}

interface Operator {
  id: string;
  name: string;
  email: string;
}

interface DashboardData {
  summary: { count: number; sum: number };
  topProducts: { name: string; totalQty: number | string }[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStudent(value: unknown): value is Student {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.name === 'string'
    && typeof value.grade === 'string'
    && typeof value.parentName === 'string'
    && typeof value.parentPhone === 'string';
}

function isApiProduct(value: unknown): value is ApiProduct {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.name === 'string'
    && typeof value.priceInCents === 'number'
    && typeof value.stock === 'number'
    && (typeof value.imageUrl === 'string' || value.imageUrl === null);
}

function isOperator(value: unknown): value is Operator {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.name === 'string'
    && typeof value.email === 'string';
}

function isDashboardData(value: unknown): value is DashboardData {
  return isRecord(value)
    && isRecord(value.summary)
    && typeof value.summary.count === 'number'
    && typeof value.summary.sum === 'number'
    && Array.isArray(value.topProducts)
    && value.topProducts.every((product) => (
      isRecord(product)
      && typeof product.name === 'string'
      && (typeof product.totalQty === 'number' || typeof product.totalQty === 'string')
    ));
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'operator' | 'manager' | 'students' | 'products' | 'dashboard'>('operator');
  const [students, setStudents] = useState<Student[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Operator State
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const selectedOperator = user?.userId;
  const [cart, setCart] = useState<CartItem[]>([]);
  const [lastSaleNotification, setLastSaleNotification] = useState<string>('');

  // Manager Forms State
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentGrade, setNewStudentGrade] = useState('');
  const [newParentName, setNewParentName] = useState('');
  const [newParentPhone, setNewParentPhone] = useState('');

  const [newProdName, setNewProdName] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdStock, setNewProdStock] = useState('');
  const [newProdImage, setNewProdImage] = useState('');

  const [newOpName, setNewOpName] = useState('');
  const [newOpEmail, setNewOpEmail] = useState('');

  // Student Detail Modal State
  const [activeStudentDetail, setActiveStudentDetail] = useState<Student | null>(null);

  // Mobile menu
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const responses = await Promise.all([
        fetch('/api/cantina?type=students'),
        fetch('/api/cantina?type=products'),
        fetch('/api/cantina?type=operators'),
        fetch('/api/cantina?type=dashboard'),
      ]);
      const failedResponse = responses.find((response) => !response.ok);
      if (failedResponse) {
        throw new Error(`Falha ao carregar os dados (HTTP ${failedResponse.status}).`);
      }

      const responseData: unknown[] = await Promise.all(
        responses.map((response) => response.json()),
      );
      const [dataStud, dataProd, dataOp, dataDash] = responseData;
      if (
        !Array.isArray(dataStud) || !dataStud.every(isStudent)
        || !Array.isArray(dataProd) || !dataProd.every(isApiProduct)
        || !Array.isArray(dataOp) || !dataOp.every(isOperator)
        || !isDashboardData(dataDash)
      ) {
        throw new Error('A resposta do servidor está em um formato inesperado.');
      }

      setStudents(dataStud);
      setProducts(dataProd.map((product) => ({
        ...product,
        price: product.priceInCents / 100,
      })));
      setOperators(dataOp);
      setDashboard(dataDash);
      setLoadError('');
    } catch (error) {
      console.error('Erro ao carregar os dados da cantina:', error);
      setLoadError('Não foi possível carregar os dados da cantina. Verifique sua conexão e tente novamente.');
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  const loadData = useCallback(() => {
    setIsLoadingData(true);
    setLoadError('');
    return fetchData();
  }, [fetchData]);

  // Loading state is updated after the requests settle; the initial state already covers the first render.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchData();
  }, [fetchData]);

  const addToCart = (prod: Product) => {
    const existing = cart.find(item => item.id === prod.id);
    if (existing) {
      setCart(cart.map(item => item.id === prod.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { ...prod, quantity: 1 }]);
    }
  };

  const checkoutSale = async () => {
    if (!selectedStudent || cart.length === 0) {
      alert('Selecione o aluno e adicione produtos ao carrinho.');
      return;
    }
    if (!selectedOperator) {
      alert('Não foi possível identificar seu usuário. Atualize a página e tente novamente.');
      return;
    }

    const res = await fetch('/api/cantina', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_sale',
        studentId: selectedStudent,
        operatorId: selectedOperator,
        items: cart.map(i => ({ productId: i.id, name: i.name, quantity: i.quantity, unitPrice: i.price }))
      })
    });

    if (res.ok) {
      const studentObj = students.find(s => s.id === selectedStudent);
      const total = cart.reduce((acc, i) => acc + (Number(i.price) * i.quantity), 0);
      const itemsDesc = cart.map(i => `${i.quantity}x ${i.name}`).join(', ');
      
      setLastSaleNotification(`Nova venda realizada para ${studentObj?.name}: ${itemsDesc} (Total: ${formatCurrency(total)})`);
      alert('Venda lançada com sucesso! Gestor notificado.');
      setCart([]);
      setSelectedStudent('');
      loadData();
    } else {
      alert('Erro ao realizar venda.');
    }
  };

  const createStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/cantina', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_student',
        name: newStudentName,
        grade: newStudentGrade,
        parentName: newParentName,
        parentPhone: newParentPhone
      })
    });
    setNewStudentName(''); setNewStudentGrade(''); setNewParentName(''); setNewParentPhone('');
    loadData();
    alert('Aluno cadastrado com sucesso!');
  };

  const createProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/cantina', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_product',
        name: newProdName,
        price: Number(newProdPrice),
        stock: Number(newProdStock),
        imageUrl: newProdImage
      })
    });
    setNewProdName(''); setNewProdPrice(''); setNewProdStock(''); setNewProdImage('');
    loadData();
    alert('Produto cadastrado com sucesso!');
  };

  const createOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/cantina', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_operator',
        name: newOpName,
        email: newOpEmail
      })
    });
    setNewOpName(''); setNewOpEmail('');
    loadData();
    alert('Operador cadastrado com sucesso!');
  };

  const sendWhatsApp = (phone: string, text: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const url = `https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleLogout = async () => {
    await logout();
  };

  const isManager = user?.role === 'MANAGER';
  const pageInfo = {
    operator: {
      title: 'Registrar uma venda',
      description: 'Selecione o aluno, adicione os produtos e confira o pedido antes de concluir.',
    },
    manager: {
      title: 'Gestão da cantina',
      description: 'Cadastre alunos, produtos e operadores em um só lugar.',
    },
    students: {
      title: 'Alunos e consumo',
      description: 'Consulte os responsáveis e tenha acesso rápido ao contato pelo WhatsApp.',
    },
    products: {
      title: 'Produtos e estoque',
      description: 'Acompanhe os itens disponíveis e seus níveis de estoque.',
    },
    dashboard: {
      title: 'Visão geral',
      description: 'Acompanhe os resultados da cantina e os produtos mais vendidos.',
    },
  }[activeTab];

  return (
    <div className="dashboard-shell min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={mobileMenuOpen}
            className="lg:hidden p-2 rounded-lg bg-slate-700 hover:bg-slate-600"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-300/10 text-emerald-300">
            <ShoppingCart className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white sm:text-lg">Cantina Escolar Pro</h1>
            <p className="hidden text-xs text-slate-400 sm:block">Gestão da cantina escolar</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-700 rounded-lg text-sm">
            <User className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-300">{user?.email}</span>
            <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/15 text-emerald-200 capitalize">
              {user?.role === 'MANAGER' ? 'Gestor' : 'Operador'}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg font-medium transition cursor-pointer flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {/* Mobile Navigation */}
        <nav aria-label="Navegação móvel" className={`lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-800 border-t border-slate-700 transform transition-transform duration-300 ${mobileMenuOpen ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="grid grid-cols-5 gap-1 p-2 pb-6">
            <button
              onClick={() => { setActiveTab('operator'); setMobileMenuOpen(false); }}
              className={`py-2 px-2 rounded-lg text-center transition ${activeTab === 'operator' ? 'bg-cyan-600 text-white' : 'text-slate-300'}`}
            >
              <ShoppingCart className="w-5 h-5 mx-auto mb-1" />
              <span className="text-xs">Operador</span>
            </button>
            <button
              onClick={() => { setActiveTab('manager'); setMobileMenuOpen(false); }}
              className={`py-2 px-2 rounded-lg text-center transition ${activeTab === 'manager' ? 'bg-emerald-600 text-white' : 'text-slate-300'}`}
            >
              <Users className="w-5 h-5 mx-auto mb-1" />
              <span className="text-xs">Gestor</span>
            </button>
            <button
              onClick={() => { setActiveTab('students'); setMobileMenuOpen(false); }}
              className={`py-2 px-2 rounded-lg text-center transition ${activeTab === 'students' ? 'bg-indigo-600 text-white' : 'text-slate-300'}`}
            >
              <Users className="w-5 h-5 mx-auto mb-1" />
              <span className="text-xs">Alunos</span>
            </button>
            <button
              onClick={() => { setActiveTab('products'); setMobileMenuOpen(false); }}
              className={`py-2 px-2 rounded-lg text-center transition ${activeTab === 'products' ? 'bg-amber-600 text-white' : 'text-slate-300'}`}
            >
              <Package className="w-5 h-5 mx-auto mb-1" />
              <span className="text-xs">Produtos</span>
            </button>
            <button
              onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
              className={`py-2 px-2 rounded-lg text-center transition ${activeTab === 'dashboard' ? 'bg-violet-600 text-white' : 'text-slate-300'}`}
            >
              <BarChart3 className="w-5 h-5 mx-auto mb-1" />
              <span className="text-xs">Dashboard</span>
            </button>
          </div>
        </nav>

        {/* Desktop Navigation */}
        <nav aria-label="Navegação principal" className="hidden lg:flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveTab('operator')}
            aria-current={activeTab === 'operator' ? 'page' : undefined}
            className={`px-4 py-2 rounded-lg font-medium transition cursor-pointer flex items-center gap-2 ${activeTab === 'operator' ? 'bg-cyan-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
          >
            <ShoppingCart className="w-4 h-4" /> Operação
          </button>
          <button
            onClick={() => setActiveTab('manager')}
            aria-current={activeTab === 'manager' ? 'page' : undefined}
            className={`px-4 py-2 rounded-lg font-medium transition cursor-pointer flex items-center gap-2 ${activeTab === 'manager' ? 'bg-emerald-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
          >
            <Users className="w-4 h-4" /> Gestor & Cadastros
          </button>
          <button
            onClick={() => setActiveTab('students')}
            aria-current={activeTab === 'students' ? 'page' : undefined}
            className={`px-4 py-2 rounded-lg font-medium transition cursor-pointer flex items-center gap-2 ${activeTab === 'students' ? 'bg-indigo-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
          >
            <Users className="w-4 h-4" /> Alunos & Consumo
          </button>
          <button
            onClick={() => setActiveTab('products')}
            aria-current={activeTab === 'products' ? 'page' : undefined}
            className={`px-4 py-2 rounded-lg font-medium transition cursor-pointer flex items-center gap-2 ${activeTab === 'products' ? 'bg-amber-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
          >
            <Package className="w-4 h-4" /> Produtos
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            aria-current={activeTab === 'dashboard' ? 'page' : undefined}
            className={`px-4 py-2 rounded-lg font-medium transition cursor-pointer flex items-center gap-2 ${activeTab === 'dashboard' ? 'bg-violet-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
          >
            <BarChart3 className="w-4 h-4" /> Dashboard & WhatsApp
          </button>
        </nav>

        <section className="dashboard-heading" aria-live="polite">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300/80">
              Área de trabalho
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{pageInfo.title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{pageInfo.description}</p>
          </div>
          <div
            role="status"
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium ${
              loadError
                ? 'border-rose-300/20 bg-rose-300/5 text-rose-200'
                : 'border-emerald-300/15 bg-emerald-300/5 text-emerald-200'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                loadError
                  ? 'bg-rose-300'
                  : isLoadingData
                    ? 'animate-pulse bg-amber-300'
                    : 'bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.8)]'
              }`}
            />
            {loadError ? 'Atenção necessária' : isLoadingData ? 'Sincronizando' : 'Sistema pronto'}
          </div>
        </section>

        {isLoadingData && (
          <div role="status" className="mb-5 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
            <LoaderCircle className="h-4 w-4 animate-spin text-emerald-300" />
            Carregando os dados da cantina...
          </div>
        )}
        {loadError && (
          <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            <span className="flex items-center gap-2">
              <CircleAlert className="h-4 w-4 shrink-0" />
              {loadError}
            </span>
            <button onClick={() => void loadData()} className="font-semibold underline underline-offset-4">
              Tentar novamente
            </button>
          </div>
        )}

        {lastSaleNotification && (
          <div className="mb-6 bg-emerald-900/60 border border-emerald-500 text-emerald-200 px-4 py-3 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span>[Notificação Gestor]: {lastSaleNotification}</span>
            </div>
            <button onClick={() => setLastSaleNotification('')} className="text-sm underline cursor-pointer">Fechar</button>
          </div>
        )}

        {/* OPERATOR SCREEN */}
        {activeTab === 'operator' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                <h2 className="text-lg font-semibold mb-3 text-cyan-400">1. Selecionar Aluno</h2>
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="">-- Toque para escolher o Aluno --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.grade}) - Resp: {s.parentName}</option>
                  ))}
                </select>
              </div>

              <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                <h2 className="text-lg font-semibold mb-3 text-cyan-400">2. Escolher Produtos (Toque para adicionar)</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {products.map(p => (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      className="bg-slate-900 hover:bg-slate-700 border border-slate-700 p-4 rounded-xl flex flex-col items-center justify-between transition cursor-pointer text-center"
                    >
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="w-16 h-16 object-cover rounded-lg mb-2" />
                      ) : (
                        <div className="w-16 h-16 bg-slate-800 rounded-lg flex items-center justify-center mb-2 text-slate-500">
                          <Package className="w-8 h-8" />
                        </div>
                      )}
                      <span className="font-medium text-sm line-clamp-1">{p.name}</span>
                      <span className="text-cyan-400 font-bold mt-1">{formatCurrency(Number(p.price))}</span>
                      <span className="text-xs text-slate-400 mt-1">Estoque: {p.stock}</span>
                    </button>
                  ))}
                  {!isLoadingData && products.length === 0 && (
                    <p className="col-span-full rounded-xl border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-400">
                      Nenhum produto cadastrado. Peça ao gestor para adicionar itens ao catálogo.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Cart / Checkout */}
            <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-semibold mb-4 text-cyan-400 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" /> Carrinho do Operador
                </h2>
                {cart.length === 0 ? (
                  <p className="text-slate-400 text-sm">Nenhum produto selecionado.</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {cart.map(item => (
                      <div key={item.id} className="flex justify-between items-center bg-slate-900 p-3 rounded-lg border border-slate-700">
                        <div>
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-slate-400">{item.quantity}x {formatCurrency(Number(item.price))}</p>
                        </div>
                        <button
                          onClick={() => setCart(cart.filter(i => i.id !== item.id))}
                          className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-700">
                <div className="flex justify-between items-center mb-4 text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-cyan-400">
                    {formatCurrency(cart.reduce((acc, i) => acc + (Number(i.price) * i.quantity), 0))}
                  </span>
                </div>
                <button
                  onClick={checkoutSale}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-3 rounded-xl font-bold transition cursor-pointer shadow-lg"
                >
                  Concluir Venda & Notificar Gestor
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MANAGER & CADASTROS */}
        {activeTab === 'manager' && isManager && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Cadastrar Aluno */}
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
              <h2 className="text-lg font-semibold mb-4 text-emerald-400 flex items-center gap-2">
                <UserPlus className="w-5 h-5" /> Cadastrar Aluno
              </h2>
              <form onSubmit={createStudent} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Nome do Aluno</label>
                  <input
                    type="text"
                    value={newStudentName}
                    onChange={e => setNewStudentName(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Turma / Série</label>
                  <input
                    type="text"
                    value={newStudentGrade}
                    onChange={e => setNewStudentGrade(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Nome do Responsável</label>
                  <input
                    type="text"
                    value={newParentName}
                    onChange={e => setNewParentName(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">WhatsApp do Responsável</label>
                  <input
                    type="text"
                    placeholder="11999999999"
                    value={newParentPhone}
                    onChange={e => setNewParentPhone(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                  />
                </div>
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 py-2.5 rounded-lg font-bold cursor-pointer transition">
                  Salvar Aluno
                </button>
              </form>
            </div>

            {/* Cadastrar Produto */}
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
              <h2 className="text-lg font-semibold mb-4 text-emerald-400 flex items-center gap-2">
                <Package className="w-5 h-5" /> Cadastrar Produto
              </h2>
              <form onSubmit={createProduct} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Nome do Produto</label>
                  <input
                    type="text"
                    value={newProdName}
                    onChange={e => setNewProdName(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Preço (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newProdPrice}
                    onChange={e => setNewProdPrice(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Estoque Inicial</label>
                  <input
                    type="number"
                    value={newProdStock}
                    onChange={e => setNewProdStock(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">URL da Foto (Supabase Storage / Imagem)</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={newProdImage}
                    onChange={e => setNewProdImage(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                  />
                </div>
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 py-2.5 rounded-lg font-bold cursor-pointer transition">
                  Salvar Produto
                </button>
              </form>
            </div>

            {/* Cadastrar Operador */}
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
              <h2 className="text-lg font-semibold mb-4 text-emerald-400 flex items-center gap-2">
                <Users className="w-5 h-5" /> Gerenciar Operadores
              </h2>
              <form onSubmit={createOperator} className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Nome do Operador</label>
                  <input
                    type="text"
                    value={newOpName}
                    onChange={e => setNewOpName(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">E-mail</label>
                  <input
                    type="email"
                    value={newOpEmail}
                    onChange={e => setNewOpEmail(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                  />
                </div>
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 py-2.5 rounded-lg font-bold cursor-pointer transition">
                  Adicionar Operador
                </button>
              </form>

              <h3 className="text-sm font-semibold mb-2 text-slate-400">Operadores Ativos:</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {operators.map(op => (
                  <div key={op.id} className="flex justify-between items-center bg-slate-900 p-2.5 rounded-lg border border-slate-700 text-sm">
                    <span>{op.name}</span>
                    <span className="text-xs text-slate-400">{op.email}</span>
                  </div>
                ))}
                {!isLoadingData && operators.length === 0 && (
                  <p className="rounded-lg border border-dashed border-slate-700 p-3 text-xs text-slate-400">
                    Nenhum operador cadastrado ainda.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Show access denied for non-managers on manager tab */}
        {activeTab === 'manager' && !isManager && (
          <div className="bg-slate-800 p-12 rounded-xl border border-slate-700 text-center">
            <Users className="w-16 h-16 mx-auto text-rose-500 mb-4" />
            <h2 className="text-xl font-bold text-rose-400 mb-2">Acesso Restrito</h2>
            <p className="text-slate-400">Apenas gestores podem acessar o cadastro de alunos, produtos e operadores.</p>
          </div>
        )}

        {/* STUDENTS LIST & DETAIL */}
        {activeTab === 'students' && (
          <div className="space-y-6">
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
              <h2 className="text-xl font-bold mb-4 text-indigo-400">Alunos Cadastrados (Clique para ver Consumo e WhatsApp)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {students.map(s => (
                  <div
                    key={s.id}
                    onClick={() => setActiveStudentDetail(s)}
                    className="bg-slate-900 hover:bg-slate-700 border border-slate-700 p-5 rounded-xl cursor-pointer transition shadow"
                  >
                    <p className="font-bold text-lg text-white">{s.name}</p>
                    <p className="text-sm text-indigo-400 mb-2">Turma: {s.grade}</p>
                    <p className="text-xs text-slate-300">Responsável: {s.parentName}</p>
                    <p className="text-xs text-slate-400">WhatsApp: {s.parentPhone}</p>
                  </div>
                ))}
                {!isLoadingData && students.length === 0 && (
                  <p className="col-span-full rounded-xl border border-dashed border-slate-700 px-4 py-10 text-center text-sm text-slate-400">
                    Nenhum aluno cadastrado. Os alunos registrados aparecerão aqui.
                  </p>
                )}
              </div>
            </div>

            {/* Modal / Detail view */}
            {activeStudentDetail && (
              <div className="bg-slate-800 p-6 rounded-xl border border-indigo-500 shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-indigo-300">Resumo de Consumo: {activeStudentDetail.name}</h3>
                  <button onClick={() => setActiveStudentDetail(null)} className="text-sm underline cursor-pointer">Fechar</button>
                </div>
                <div className="space-y-3 mb-6">
                  <p className="text-sm text-slate-300">Turma: {activeStudentDetail.grade}</p>
                  <p className="text-sm text-slate-300">Responsável: {activeStudentDetail.parentName} ({activeStudentDetail.parentPhone})</p>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={() => sendWhatsApp(activeStudentDetail.parentPhone, `Olá ${activeStudentDetail.parentName}, aqui está o resumo consolidado de consumo do aluno ${activeStudentDetail.name} na cantina hoje.`)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <Phone className="w-4 h-4" /> Enviar Resumo via WhatsApp
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PRODUCTS SCREEN */}
        {activeTab === 'products' && (
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
            <h2 className="text-xl font-bold mb-4 text-amber-400">Estoque e Produtos da Cantina</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {products.map(p => (
                <div key={p.id} className="bg-slate-900 border border-slate-700 p-4 rounded-xl flex flex-col justify-between">
                  <div>
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="w-full h-32 object-cover rounded-lg mb-3" />
                    ) : (
                      <div className="w-full h-32 bg-slate-800 rounded-lg flex items-center justify-center mb-3 text-slate-500">
                        <Package className="w-12 h-12" />
                      </div>
                    )}
                    <h3 className="font-bold text-white mb-1">{p.name}</h3>
                    <p className="text-cyan-400 font-bold mb-2">{formatCurrency(Number(p.price))}</p>
                  </div>
                  <div className="text-xs text-slate-400 flex justify-between items-center mt-2 pt-2 border-t border-slate-800">
                    <span>Estoque Disponível:</span>
                    <span className="font-bold text-white text-sm">{p.stock}</span>
                  </div>
                </div>
              ))}
              {!isLoadingData && products.length === 0 && (
                <p className="col-span-full rounded-xl border border-dashed border-slate-700 px-4 py-10 text-center text-sm text-slate-400">
                  Nenhum produto cadastrado. Cadastre os itens da cantina para acompanhar o estoque.
                </p>
              )}
            </div>
          </div>
        )}

        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                <h3 className="text-sm font-medium text-slate-400 mb-2">Faturamento Total</h3>
                <p className="text-3xl font-extrabold text-cyan-400">
                  {formatCurrency(Number(dashboard?.summary?.sum ?? 0))}
                </p>
              </div>
              <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                <h3 className="text-sm font-medium text-slate-400 mb-2">Total de Vendas</h3>
                <p className="text-3xl font-extrabold text-emerald-400">
                  {dashboard?.summary?.count || 0}
                </p>
              </div>
              <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                <h3 className="text-sm font-medium text-slate-400 mb-2">Ações Rápidas WhatsApp</h3>
                <button
                  onClick={() => sendWhatsApp('11999999999', 'Olá Gestor/Responsável, relatório consolidado da cantina gerado.')}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 cursor-pointer mt-1"
                >
                  <Phone className="w-4 h-4" /> Enviar Relatório Consolidado
                </button>
              </div>
            </div>

            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
              <h3 className="text-lg font-bold mb-4 text-violet-400">Produtos Mais Vendidos</h3>
              <div className="space-y-3">
                {dashboard?.topProducts?.map((tp, index) => (
                  <div key={index} className="flex justify-between items-center bg-slate-900 p-3 rounded-lg border border-slate-700">
                    <span className="font-medium text-white">{tp.name}</span>
                    <span className="text-cyan-400 font-bold">{tp.totalQty} unidades vendidas</span>
                  </div>
                ))}
                {!isLoadingData && dashboard?.topProducts?.length === 0 && (
                  <p className="rounded-xl border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-400">
                    Ainda não há vendas para exibir. Os produtos mais vendidos aparecerão aqui.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
