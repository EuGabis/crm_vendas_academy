import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  Phone,
  IdCard,
  Plus,
  Trash2,
  Check,
  Loader2,
  Activity,
} from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingState } from '@/components/ui/empty-state';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/lib/auth';
import { useSellers, useCourses } from '@/hooks/useSupabaseData';
import {
  useStudent,
  useEnrollments,
  useUpsertEnrollment,
  useDeleteEnrollment,
  useTickets,
  useUpsertTicket,
  useNotes,
  useAddNote,
  useDeleteNote,
  useNPSForStudent,
  useAddNPS,
  useOnboarding,
  useToggleOnboardingStep,
  computeHealthScore,
} from '@/hooks/useCS';
import {
  ENROLLMENT_STATUS_LABELS,
  ONBOARDING_DEFAULT_STEPS,
  PAYMENT_METHOD_LABELS,
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  type EnrollmentStatus,
  type PaymentMethod,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from '@/types/domain';
import { cn, formatCurrency } from '@/lib/utils';

const PAYMENT_METHODS: PaymentMethod[] = [
  'AVISTA',
  'CARTAO_PARCELADO',
  'CARTAO_RECORRENCIA',
  'BOLETO',
  'PIX',
];

const ENROLLMENT_STATUSES: EnrollmentStatus[] = ['active', 'cancelled', 'overdue', 'paused'];
const TICKET_CATEGORIES: TicketCategory[] = [
  'duvida_conteudo',
  'duvida_tecnica',
  'financeiro',
  'sugestao',
  'reclamacao',
  'outros',
];
const TICKET_PRIORITIES: TicketPriority[] = ['baixa', 'media', 'alta', 'urgente'];

const HEALTH_COLOR: Record<'saudavel' | 'atencao' | 'critico', string> = {
  saudavel: 'text-emerald-400 bg-emerald-500/15 ring-emerald-500/30',
  atencao: 'text-amber-400 bg-amber-500/15 ring-amber-500/30',
  critico: 'text-red-400 bg-red-500/15 ring-red-500/30',
};

const STATUS_VARIANT: Record<EnrollmentStatus, 'success' | 'danger' | 'warning' | 'muted'> = {
  active: 'success',
  overdue: 'warning',
  cancelled: 'danger',
  paused: 'muted',
};

export function CSAlunoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: student, isLoading: lStudent } = useStudent(id);
  const { data: sellers = [] } = useSellers();
  const { data: courses = [] } = useCourses();
  const { data: enrollments = [] } = useEnrollments(id);
  const { data: tickets = [] } = useTickets(id);
  const { data: notes = [] } = useNotes(id);
  const { data: nps = [] } = useNPSForStudent(id);
  const { data: onboardingRows = [] } = useOnboarding(id);

  const upsertEnrollment = useUpsertEnrollment();
  const deleteEnrollment = useDeleteEnrollment();
  const upsertTicket = useUpsertTicket();
  const addNote = useAddNote();
  const deleteNote = useDeleteNote();
  const addNPS = useAddNPS();
  const toggleOnboarding = useToggleOnboardingStep();

  const seller = useMemo(
    () => sellers.find((s) => s.id === student?.sellerId),
    [sellers, student?.sellerId],
  );
  const coursesById = useMemo(
    () => Object.fromEntries(courses.map((c) => [c.id, c])),
    [courses],
  );

  // Health Score
  const openTickets = tickets.filter((t) => t.status === 'aberto' || t.status === 'em_andamento').length;
  const lastNPS = nps[0]?.score ?? null;
  const onboardingDone = ONBOARDING_DEFAULT_STEPS.filter((step) =>
    onboardingRows.some((r) => r.stepKey === step.key && r.completedAt),
  ).length;
  const onboardingPct = onboardingDone / ONBOARDING_DEFAULT_STEPS.length;
  const health = computeHealthScore({ enrollments, openTickets, lastNPS, onboardingPct });

  // Forms
  const [enrollmentOpen, setEnrollmentOpen] = useState(false);
  const [enrollmentDraft, setEnrollmentDraft] = useState({
    courseId: '',
    paymentMethod: 'AVISTA' as PaymentMethod,
    isRecurring: false,
    status: 'active' as EnrollmentStatus,
    nextRenewalAt: '',
  });

  const [ticketOpen, setTicketOpen] = useState(false);
  const [ticketDraft, setTicketDraft] = useState({
    subject: '',
    body: '',
    category: 'outros' as TicketCategory,
    priority: 'media' as TicketPriority,
    status: 'aberto' as TicketStatus,
    assignedTo: '',
  });

  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [npsComment, setNpsComment] = useState('');
  const [newNote, setNewNote] = useState('');

  async function handleEnrollment(e: FormEvent) {
    e.preventDefault();
    if (!id || !enrollmentDraft.courseId) return;
    try {
      await upsertEnrollment.mutateAsync({
        studentId: id,
        courseId: enrollmentDraft.courseId,
        paymentMethod: enrollmentDraft.paymentMethod,
        isRecurring: enrollmentDraft.isRecurring,
        status: enrollmentDraft.status,
        nextRenewalAt: enrollmentDraft.nextRenewalAt || null,
      });
      toast.success('Matrícula adicionada');
      setEnrollmentOpen(false);
      setEnrollmentDraft({
        courseId: '',
        paymentMethod: 'AVISTA',
        isRecurring: false,
        status: 'active',
        nextRenewalAt: '',
      });
    } catch (err) {
      toast.error('Falha: ' + (err as Error).message);
    }
  }

  async function handleTicket(e: FormEvent) {
    e.preventDefault();
    if (!id || !ticketDraft.subject) return;
    try {
      await upsertTicket.mutateAsync({
        studentId: id,
        subject: ticketDraft.subject,
        body: ticketDraft.body,
        category: ticketDraft.category,
        priority: ticketDraft.priority,
        status: ticketDraft.status,
        assignedTo: ticketDraft.assignedTo || null,
      });
      toast.success('Ticket criado');
      setTicketOpen(false);
      setTicketDraft({
        subject: '',
        body: '',
        category: 'outros',
        priority: 'media',
        status: 'aberto',
        assignedTo: '',
      });
    } catch (err) {
      toast.error('Falha: ' + (err as Error).message);
    }
  }

  async function handleAddNote() {
    if (!id || !newNote.trim()) return;
    try {
      await addNote.mutateAsync({
        studentId: id,
        body: newNote.trim(),
        createdBy: user?.id,
      });
      setNewNote('');
      toast.success('Nota adicionada');
    } catch (err) {
      toast.error('Falha: ' + (err as Error).message);
    }
  }

  async function handleAddNPS() {
    if (!id || npsScore === null) return;
    try {
      await addNPS.mutateAsync({
        studentId: id,
        score: npsScore,
        comment: npsComment.trim() || undefined,
      });
      setNpsScore(null);
      setNpsComment('');
      toast.success('NPS registrado');
    } catch (err) {
      toast.error('Falha: ' + (err as Error).message);
    }
  }

  if (lStudent) {
    return (
      <>
        <Header title="Carregando..." />
        <div className="page">
          <LoadingState />
        </div>
      </>
    );
  }

  if (!student) {
    return (
      <>
        <Header title="Aluno não encontrado" />
        <div className="page">
          <Card>
            <p className="text-sm text-zinc-400">
              Este aluno não existe ou foi removido.{' '}
              <Link to="/cs/alunos" className="text-brand-400 hover:underline">
                Voltar para lista
              </Link>
            </p>
          </Card>
        </div>
      </>
    );
  }

  const initials = student.fullName
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  return (
    <>
      <Header title={student.fullName} subtitle="Perfil do aluno · Customer Success" />
      <div className="page">
        <Button variant="ghost" size="sm" onClick={() => navigate('/cs/alunos')}>
          <ArrowLeft className="h-4 w-4" /> Voltar para alunos
        </Button>

        {/* Card principal: identidade + health score */}
        <Card>
          <div className="flex items-start gap-4 flex-wrap">
            <Avatar className="h-16 w-16 text-lg">
              <AvatarFallback className="bg-brand-gradient text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-white">{student.fullName}</h2>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-zinc-400">
                {student.cpf && (
                  <span className="inline-flex items-center gap-1">
                    <IdCard className="h-3 w-3" /> {student.cpf}
                  </span>
                )}
                {student.email && (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {student.email}
                  </span>
                )}
                {student.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {student.phone}
                  </span>
                )}
              </div>
              {seller && (
                <div className="flex items-center gap-2 mt-3 text-xs">
                  <span className="text-zinc-500">Responsável:</span>
                  <Avatar className="h-5 w-5 text-[9px]">
                    <AvatarFallback style={{ background: seller.avatarColor }}>
                      {seller.fullName
                        .split(' ')
                        .slice(0, 2)
                        .map((p) => p[0])
                        .join('')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-zinc-300">{seller.fullName}</span>
                </div>
              )}
            </div>

            {/* Health Score */}
            <div
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-3 rounded-2xl ring-1',
                HEALTH_COLOR[health.level],
              )}
            >
              <Activity className="h-4 w-4" />
              <div className="text-2xl font-bold tabular-nums leading-none">{health.score}</div>
              <div className="text-[10px] uppercase tracking-wider font-semibold">
                {health.level === 'saudavel'
                  ? 'Saudável'
                  : health.level === 'atencao'
                    ? 'Atenção'
                    : 'Crítico'}
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="matriculas">
          <TabsList className="w-full sm:w-auto overflow-x-auto scrollbar-hide">
            <TabsTrigger value="matriculas">Matrículas ({enrollments.length})</TabsTrigger>
            <TabsTrigger value="tickets">
              Tickets ({openTickets > 0 && <span className="text-amber-400">{openTickets}/</span>}
              {tickets.length})
            </TabsTrigger>
            <TabsTrigger value="onboarding">
              Onboarding ({onboardingDone}/{ONBOARDING_DEFAULT_STEPS.length})
            </TabsTrigger>
            <TabsTrigger value="nps">NPS ({nps.length})</TabsTrigger>
            <TabsTrigger value="notas">Notas ({notes.length})</TabsTrigger>
          </TabsList>

          {/* MATRICULAS */}
          <TabsContent value="matriculas">
            <Card className="!p-0 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                <h3 className="text-sm font-semibold text-white">Cursos adquiridos</h3>
                <Button size="sm" onClick={() => setEnrollmentOpen(true)}>
                  <Plus className="h-3.5 w-3.5" /> Nova matrícula
                </Button>
              </div>
              {enrollments.length === 0 ? (
                <div className="p-8 text-center text-sm text-zinc-500">
                  Nenhuma matrícula registrada.
                </div>
              ) : (
                <div className="divide-y divide-zinc-900">
                  {enrollments.map((e) => {
                    const course = coursesById[e.courseId];
                    return (
                      <div
                        key={e.id}
                        className="p-4 flex items-center justify-between gap-3 flex-wrap"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-zinc-100">
                              {course?.name ?? 'Curso removido'}
                            </span>
                            <Badge variant={STATUS_VARIANT[e.status]}>
                              {ENROLLMENT_STATUS_LABELS[e.status]}
                            </Badge>
                            {e.isRecurring && (
                              <Badge variant="info">Recorrente</Badge>
                            )}
                          </div>
                          <div className="text-xs text-zinc-500 mt-1">
                            {PAYMENT_METHOD_LABELS[e.paymentMethod]} ·{' '}
                            {course && formatCurrency(course.price)} · matriculado em{' '}
                            {new Date(e.enrolledAt).toLocaleDateString('pt-BR')}
                            {e.nextRenewalAt && (
                              <>
                                {' · '}
                                <span className="text-amber-300">
                                  Renova em {new Date(e.nextRenewalAt).toLocaleDateString('pt-BR')}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-red-400 hover:text-red-300"
                          onClick={async () => {
                            if (confirm('Remover matrícula?')) {
                              await deleteEnrollment.mutateAsync(e.id);
                              toast.success('Matrícula removida');
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* TICKETS */}
          <TabsContent value="tickets">
            <Card className="!p-0 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                <h3 className="text-sm font-semibold text-white">Tickets de suporte</h3>
                <Button size="sm" onClick={() => setTicketOpen(true)}>
                  <Plus className="h-3.5 w-3.5" /> Novo ticket
                </Button>
              </div>
              {tickets.length === 0 ? (
                <div className="p-8 text-center text-sm text-zinc-500">
                  Nenhum ticket registrado.
                </div>
              ) : (
                <div className="divide-y divide-zinc-900">
                  {tickets.map((t) => (
                    <div key={t.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-zinc-100">{t.subject}</span>
                            <Badge variant="muted">{TICKET_CATEGORY_LABELS[t.category]}</Badge>
                            <Badge
                              variant={
                                t.status === 'resolvido' || t.status === 'fechado'
                                  ? 'success'
                                  : t.priority === 'urgente' || t.priority === 'alta'
                                    ? 'danger'
                                    : 'warning'
                              }
                            >
                              {TICKET_STATUS_LABELS[t.status]}
                            </Badge>
                            <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                              {TICKET_PRIORITY_LABELS[t.priority]}
                            </span>
                          </div>
                          {t.body && (
                            <p className="text-xs text-zinc-400 mt-1.5 whitespace-pre-wrap">
                              {t.body}
                            </p>
                          )}
                          <p className="text-[11px] text-zinc-600 mt-2">
                            Criado em {new Date(t.createdAt).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* ONBOARDING */}
          <TabsContent value="onboarding">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Onboarding do aluno</h3>
                <Badge variant={onboardingPct === 1 ? 'success' : 'warning'}>
                  {Math.round(onboardingPct * 100)}% completo
                </Badge>
              </div>
              <div className="space-y-2">
                {ONBOARDING_DEFAULT_STEPS.map((step) => {
                  const row = onboardingRows.find((r) => r.stepKey === step.key);
                  const done = !!row?.completedAt;
                  return (
                    <button
                      key={step.key}
                      type="button"
                      onClick={() =>
                        toggleOnboarding.mutate({
                          studentId: student.id,
                          stepKey: step.key,
                          completed: !done,
                        })
                      }
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                        done
                          ? 'border-emerald-500/30 bg-emerald-500/5'
                          : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700',
                      )}
                    >
                      <div
                        className={cn(
                          'h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors',
                          done
                            ? 'border-emerald-400 bg-emerald-400'
                            : 'border-zinc-700',
                        )}
                      >
                        {done && <Check className="h-3 w-3 text-zinc-950 stroke-[3]" />}
                      </div>
                      <div className="flex-1">
                        <div
                          className={cn(
                            'text-sm font-medium',
                            done ? 'text-emerald-300' : 'text-zinc-200',
                          )}
                        >
                          {step.label}
                        </div>
                        {done && row?.completedAt && (
                          <div className="text-[10px] text-zinc-500 mt-0.5">
                            Concluído em {new Date(row.completedAt).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          </TabsContent>

          {/* NPS */}
          <TabsContent value="nps">
            <Card>
              <h3 className="text-sm font-semibold text-white mb-3">Registrar NPS</h3>
              <p className="text-xs text-zinc-500 mb-3">
                De 0 a 10, o quanto o aluno indicaria a Lito Academy?
              </p>
              <div className="grid grid-cols-11 gap-1 mb-3">
                {Array.from({ length: 11 }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setNpsScore(i)}
                    className={cn(
                      'h-10 rounded-lg border text-sm font-semibold transition-all',
                      npsScore === i
                        ? i <= 6
                          ? 'border-red-500 bg-red-500/20 text-red-300'
                          : i <= 8
                            ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                            : 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                        : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700',
                    )}
                  >
                    {i}
                  </button>
                ))}
              </div>
              <Input
                value={npsComment}
                onChange={(e) => setNpsComment(e.target.value)}
                placeholder="Comentário (opcional)"
              />
              <div className="flex justify-end mt-3">
                <Button onClick={handleAddNPS} disabled={npsScore === null || addNPS.isPending}>
                  {addNPS.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Salvar NPS
                </Button>
              </div>
            </Card>
            {nps.length > 0 && (
              <Card className="mt-4 !p-0 overflow-hidden">
                <h3 className="text-sm font-semibold text-white p-4 border-b border-zinc-800">
                  Histórico de NPS
                </h3>
                <div className="divide-y divide-zinc-900">
                  {nps.map((n) => (
                    <div key={n.id} className="p-4 flex items-start gap-3">
                      <div
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold shrink-0',
                          n.score <= 6
                            ? 'bg-red-500/15 text-red-300'
                            : n.score <= 8
                              ? 'bg-amber-500/15 text-amber-300'
                              : 'bg-emerald-500/15 text-emerald-300',
                        )}
                      >
                        {n.score}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-zinc-500">
                          {new Date(n.createdAt).toLocaleString('pt-BR')}
                        </div>
                        {n.comment && (
                          <p className="text-sm text-zinc-300 mt-1">{n.comment}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </TabsContent>

          {/* NOTAS */}
          <TabsContent value="notas">
            <Card>
              <h3 className="text-sm font-semibold text-white mb-3">Adicionar nota</h3>
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={3}
                placeholder="Ex: Liguei hoje, aluno disse que está com dificuldade no módulo 3..."
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 resize-y"
              />
              <div className="flex justify-end mt-3">
                <Button
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || addNote.isPending}
                >
                  {addNote.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Salvar nota
                </Button>
              </div>
            </Card>
            {notes.length > 0 && (
              <Card className="mt-4 !p-0 overflow-hidden">
                <h3 className="text-sm font-semibold text-white p-4 border-b border-zinc-800">
                  Histórico
                </h3>
                <div className="divide-y divide-zinc-900">
                  {notes.map((n) => (
                    <div key={n.id} className="p-4 flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] text-zinc-500 mb-1">
                          {new Date(n.createdAt).toLocaleString('pt-BR')}
                        </div>
                        <p className="text-sm text-zinc-200 whitespace-pre-wrap">{n.body}</p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-red-400 hover:text-red-300"
                        onClick={async () => {
                          await deleteNote.mutateAsync(n.id);
                          toast.success('Nota removida');
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal: nova matrícula */}
      <Dialog open={enrollmentOpen} onOpenChange={setEnrollmentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova matrícula</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEnrollment} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Curso</label>
              <Select
                value={enrollmentDraft.courseId}
                onValueChange={(v) => setEnrollmentDraft((d) => ({ ...d, courseId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} — {formatCurrency(c.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
                  Forma de pagamento
                </label>
                <Select
                  value={enrollmentDraft.paymentMethod}
                  onValueChange={(v) =>
                    setEnrollmentDraft((d) => ({
                      ...d,
                      paymentMethod: v as PaymentMethod,
                      isRecurring: v === 'CARTAO_RECORRENCIA',
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {PAYMENT_METHOD_LABELS[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Status</label>
                <Select
                  value={enrollmentDraft.status}
                  onValueChange={(v) =>
                    setEnrollmentDraft((d) => ({ ...d, status: v as EnrollmentStatus }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENROLLMENT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {ENROLLMENT_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(enrollmentDraft.isRecurring ||
              enrollmentDraft.paymentMethod === 'BOLETO' ||
              enrollmentDraft.paymentMethod === 'PIX') && (
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
                  Próxima renovação / vencimento
                </label>
                <Input
                  type="date"
                  value={enrollmentDraft.nextRenewalAt}
                  onChange={(e) =>
                    setEnrollmentDraft((d) => ({ ...d, nextRenewalAt: e.target.value }))
                  }
                />
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEnrollmentOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!enrollmentDraft.courseId || upsertEnrollment.isPending}
              >
                {upsertEnrollment.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Adicionar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: novo ticket */}
      <Dialog open={ticketOpen} onOpenChange={setTicketOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo ticket</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTicket} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Assunto</label>
              <Input
                value={ticketDraft.subject}
                onChange={(e) => setTicketDraft((d) => ({ ...d, subject: e.target.value }))}
                placeholder="Ex: Dúvida no módulo 3"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Descrição</label>
              <textarea
                value={ticketDraft.body}
                onChange={(e) => setTicketDraft((d) => ({ ...d, body: e.target.value }))}
                rows={3}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 resize-y"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Categoria</label>
                <Select
                  value={ticketDraft.category}
                  onValueChange={(v) =>
                    setTicketDraft((d) => ({ ...d, category: v as TicketCategory }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TICKET_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {TICKET_CATEGORY_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Prioridade</label>
                <Select
                  value={ticketDraft.priority}
                  onValueChange={(v) =>
                    setTicketDraft((d) => ({ ...d, priority: v as TicketPriority }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TICKET_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {TICKET_PRIORITY_LABELS[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
                Atribuir a (opcional)
              </label>
              <Select
                value={ticketDraft.assignedTo || 'none'}
                onValueChange={(v) =>
                  setTicketDraft((d) => ({ ...d, assignedTo: v === 'none' ? '' : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguém</SelectItem>
                  {sellers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTicketOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!ticketDraft.subject || upsertTicket.isPending}>
                {upsertTicket.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Criar ticket
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
