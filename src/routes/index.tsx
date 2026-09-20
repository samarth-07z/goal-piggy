import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowDown, CalendarDays, Check, ChevronRight, CircleHelp, History, Home, MoreHorizontal, Pencil, Plus, Target, Trash2, WalletCards } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import headphones from "@/assets/headphones.jpg";
import type { Tables } from "@/integrations/supabase/types";

type Goal = Tables<"savings_goals">;
type Contribution = Tables<"savings_contributions">;
type FormValues = { productName: string; totalAmount: string; dailyTarget: string; durationDays: string };

const demoGoal: Goal = {
  id: "demo", user_id: "demo", product_name: "Sony WH-1000XM5", total_amount: 450,
  daily_target: 15, duration_days: 30, saved_amount: 225, product_image_url: null,
  start_date: "2026-09-05", created_at: "2026-09-05T09:00:00Z", updated_at: "2026-09-20T09:00:00Z",
};
const demoHistory: Contribution[] = [
  { id: "d1", goal_id: "demo", user_id: "demo", amount: 15, contribution_date: "2026-09-20", note: "Daily saving", created_at: "2026-09-20T08:30:00Z", updated_at: "2026-09-20T08:30:00Z" },
  { id: "d2", goal_id: "demo", user_id: "demo", amount: 15, contribution_date: "2026-09-19", note: "Daily saving", created_at: "2026-09-19T08:30:00Z", updated_at: "2026-09-19T08:30:00Z" },
  { id: "d3", goal_id: "demo", user_id: "demo", amount: 30, contribution_date: "2026-09-18", note: "Extra contribution", created_at: "2026-09-18T08:30:00Z", updated_at: "2026-09-18T08:30:00Z" },
];

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Daily — Your EMI Savings Wallet" },
    { name: "description", content: "Track daily savings, payments, and progress toward your next EMI." },
    { property: "og:title", content: "Daily — Your EMI Savings Wallet" },
    { property: "og:description", content: "Track daily savings, payments, and progress toward your next EMI." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: SavingsDashboard,
});

const money = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: value % 1 ? 2 : 0 }).format(value);
const dayLabel = (date: string) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(`${date}T12:00:00`));

function SavingsDashboard() {
  const [goal, setGoal] = useState<Goal>(demoGoal);
  const [history, setHistory] = useState<Contribution[]>(demoHistory);
  const [userId, setUserId] = useState<string>();
  const [tab, setTab] = useState<"home" | "history">("home");
  const [goalOpen, setGoalOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string>();

  useEffect(() => {
    let alive = true;
    async function connect() {
      let { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const result = await supabase.auth.signInAnonymously();
        user = result.data.user;
      }
      if (!alive || !user) return;
      setUserId(user.id);
      const { data } = await supabase.from("savings_goals").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (data && alive) {
        setGoal(data);
        const { data: payments } = await supabase.from("savings_contributions").select("*").eq("goal_id", data.id).order("contribution_date", { ascending: false }).order("created_at", { ascending: false });
        if (payments) setHistory(payments);
      }
    }
    void connect();
    return () => { alive = false; };
  }, []);

  const percentage = Math.min(100, Math.round((Number(goal.saved_amount) / Number(goal.total_amount)) * 100));
  const remaining = Math.max(0, Number(goal.total_amount) - Number(goal.saved_amount));
  const daysSaved = Math.min(goal.duration_days, Math.round(Number(goal.saved_amount) / Number(goal.daily_target)));
  const todayPaid = useMemo(() => history.some((item) => item.contribution_date === new Date().toISOString().slice(0, 10)), [history]);

  async function ensureGoal(values?: FormValues) {
    if (!userId) throw new Error("Your wallet is still connecting. Please try again.");
    if (goal.id !== "demo") return goal;
    const payload = values ? {
      product_name: values.productName, total_amount: Number(values.totalAmount), daily_target: Number(values.dailyTarget), duration_days: Number(values.durationDays),
    } : { product_name: goal.product_name, total_amount: goal.total_amount, daily_target: goal.daily_target, duration_days: goal.duration_days };
    const { data, error } = await supabase.from("savings_goals").insert({ ...payload, user_id: userId }).select().single();
    if (error) throw error;
    setGoal(data);
    setHistory([]);
    return data;
  }

  async function addContribution(amount: number) {
    setBusy(true); setNotice(undefined);
    try {
      const active = await ensureGoal();
      const payment = Math.min(amount, Number(active.total_amount) - Number(active.saved_amount));
      if (payment <= 0) return;
      const { data, error } = await supabase.from("savings_contributions").insert({ goal_id: active.id, user_id: active.user_id, amount: payment, note: payment > Number(active.daily_target) ? "Extra contribution" : "Daily saving" }).select().single();
      if (error) throw error;
      setHistory((items) => [data, ...items]);
      setGoal((current) => ({ ...current, saved_amount: Number(current.saved_amount) + payment }));
      setPayOpen(false); setNotice(`${money(payment)} added to your wallet`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Payment could not be saved."); }
    finally { setBusy(false); }
  }

  async function saveGoal(values: FormValues) {
    setBusy(true); setNotice(undefined);
    try {
      const next = { product_name: values.productName, total_amount: Number(values.totalAmount), daily_target: Number(values.dailyTarget), duration_days: Number(values.durationDays) };
      if (goal.id === "demo") await ensureGoal(values);
      else {
        const { data, error } = await supabase.from("savings_goals").update(next).eq("id", goal.id).select().single();
        if (error) throw error;
        setGoal(data);
      }
      setGoalOpen(false); setNotice("Your goal has been updated");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Goal could not be saved."); }
    finally { setBusy(false); }
  }

  async function removeGoal() {
    setBusy(true);
    if (goal.id !== "demo") await supabase.from("savings_goals").delete().eq("id", goal.id);
    setGoal(demoGoal); setHistory(demoHistory); setDeleteOpen(false); setMenuOpen(false); setNotice("Goal removed. The example is ready when you are."); setBusy(false);
  }

  return (
    <main className="min-h-screen bg-background pb-28 text-foreground lg:pb-10">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-surface backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 lg:h-20 lg:px-8">
          <button className="flex items-center gap-2" onClick={() => setTab("home")} aria-label="Daily home"><span className="grid size-8 place-items-center rounded-xl bg-foreground text-sm font-bold text-background">D</span><span className="text-lg font-semibold">Daily</span></button>
          <div className="hidden items-center gap-2 rounded-full bg-muted p-1 md:flex">
            <NavButton active={tab === "home"} onClick={() => setTab("home")} icon={<Home />}>Overview</NavButton>
            <NavButton active={tab === "history"} onClick={() => setTab("history")} icon={<History />}>Activity</NavButton>
          </div>
          <div className="relative"><Button variant="ghost" size="icon" aria-label="Goal options" onClick={() => setMenuOpen((v) => !v)}><MoreHorizontal /></Button>{menuOpen && <div className="absolute right-0 top-11 z-40 w-44 rounded-xl border bg-surface-raised p-1.5 shadow-soft"><button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted" onClick={() => { setGoalOpen(true); setMenuOpen(false); }}><Pencil className="size-4"/> Edit goal</button><button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-muted" onClick={() => setDeleteOpen(true)}><Trash2 className="size-4"/> Delete goal</button></div>}</div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8 lg:py-12">
        {notice && <div className="mb-6 flex items-center justify-between rounded-xl border bg-surface-raised px-4 py-3 text-sm shadow-soft"><span className="flex items-center gap-2"><Check className="size-4 text-positive"/>{notice}</span><button onClick={() => setNotice(undefined)} aria-label="Dismiss">×</button></div>}
        {tab === "home" ? <>
          <div className="mb-8 animate-rise"><p className="mb-2 text-sm font-medium text-muted-foreground">Good morning</p><h1 className="text-4xl font-semibold leading-tight md:text-5xl">One small step, every day.</h1></div>
          <div className="grid gap-6 lg:grid-cols-[1.08fr_.92fr]">
            <section className="group overflow-hidden rounded-3xl bg-surface-raised shadow-soft animate-rise [animation-delay:80ms]">
              <div className="relative aspect-[16/10] overflow-hidden bg-muted"><img src={headphones} alt="Matte black headphones" width={1200} height={912} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.025]"/></div>
              <div className="p-6 md:p-8"><div className="flex items-start justify-between gap-4"><div><p className="mb-2 text-sm font-medium text-muted-foreground">Your EMI goal</p><h2 className="text-2xl font-semibold md:text-3xl">{goal.product_name}</h2><p className="mt-2 text-muted-foreground">{money(Number(goal.total_amount))} EMI · {goal.duration_days}-day savings goal</p></div><Button variant="soft" size="icon" aria-label="Edit goal" onClick={() => setGoalOpen(true)}><Pencil/></Button></div>
                <div className="mt-8"><div className="mb-3 flex items-end justify-between"><p className="text-xl font-semibold">{money(Number(goal.saved_amount))} <span className="text-sm font-normal text-muted-foreground">saved of {money(Number(goal.total_amount))}</span></p><span className="text-sm font-semibold">{percentage}%</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${percentage}%` }}/></div></div>
              </div>
            </section>

            <section className="relative overflow-hidden rounded-3xl bg-wallet p-7 text-wallet-foreground shadow-wallet animate-rise md:p-9 [animation-delay:140ms]">
              <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full border border-wallet-foreground/10"/><div className="pointer-events-none absolute -right-4 -top-4 size-36 rounded-full border border-wallet-foreground/10"/>
              <div className="relative"><div className="mb-10 flex items-center justify-between"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.12em]"><WalletCards className="size-4"/> EMI wallet</div><span className="rounded-full bg-wallet-foreground/10 px-3 py-1 text-xs">Active</span></div>
                <p className="text-sm text-wallet-foreground/55">Current balance</p><p className="mt-1 text-5xl font-semibold tracking-normal md:text-6xl">{money(Number(goal.saved_amount))}</p>
                <div className="mt-10 grid grid-cols-2 gap-6 border-t border-wallet-foreground/10 pt-6"><div><p className="text-xs text-wallet-foreground/50">Goal</p><p className="mt-1 text-lg font-semibold">{money(Number(goal.total_amount))}</p></div><div><p className="text-xs text-wallet-foreground/50">Remaining</p><p className="mt-1 text-lg font-semibold">{money(remaining)}</p></div></div>
                <div className="mt-7 h-1.5 overflow-hidden rounded-full bg-wallet-foreground/10"><div className="h-full rounded-full bg-primary" style={{ width: `${percentage}%` }}/></div><div className="mt-3 flex justify-between text-xs text-wallet-foreground/50"><span>{percentage}% complete</span><span>{goal.duration_days - daysSaved} days left</span></div>
                <Button variant="wallet" size="pill" className="mt-8 w-full" onClick={() => setPayOpen(true)} disabled={remaining === 0}><Plus/> {remaining === 0 ? "Goal complete" : `Save today · ${money(Number(goal.daily_target))}`}</Button>
              </div>
            </section>
          </div>

          <section className="mt-8 animate-rise [animation-delay:220ms]"><div className="mb-4 flex items-end justify-between"><div><p className="text-sm font-medium text-muted-foreground">Your pace</p><h2 className="mt-1 text-2xl font-semibold">This month</h2></div><button onClick={() => setTab("history")} className="flex items-center gap-1 text-sm font-medium text-primary">View all <ChevronRight className="size-4"/></button></div>
            <div className="grid gap-3 sm:grid-cols-3"><Metric icon={<Target/>} label="Daily target" value={money(Number(goal.daily_target))}/><Metric icon={<CalendarDays/>} label="Days funded" value={`${daysSaved} of ${goal.duration_days}`}/><Metric icon={<ArrowDown/>} label="Today's status" value={todayPaid ? "Saved" : "Due today"}/></div>
          </section>
          <HistoryList history={history.slice(0, 4)} />
        </> : <div className="animate-rise"><div className="mb-8"><p className="text-sm font-medium text-muted-foreground">Savings activity</p><h1 className="mt-2 text-4xl font-semibold">Every step counts.</h1></div><HistoryList history={history} full/><div className="mt-8 rounded-2xl bg-surface-raised p-5 text-sm text-muted-foreground shadow-soft"><CircleHelp className="mb-3 size-5 text-primary"/>Your contributions are securely stored and automatically reflected in your wallet balance.</div></div>}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-surface px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden"><div className="mx-auto flex max-w-sm justify-around"><MobileNav active={tab === "home"} icon={<Home/>} label="Home" onClick={() => setTab("home")}/><button onClick={() => setPayOpen(true)} className="-mt-7 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-soft" aria-label="Add money"><Plus/></button><MobileNav active={tab === "history"} icon={<History/>} label="Activity" onClick={() => setTab("history")}/></div></nav>
      <GoalDialog open={goalOpen} onOpenChange={setGoalOpen} goal={goal} busy={busy} onSave={saveGoal}/>
      <PaymentDialog open={payOpen} onOpenChange={setPayOpen} target={Number(goal.daily_target)} remaining={remaining} busy={busy} onPay={addContribution}/>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}><AlertDialogContent className="max-w-sm rounded-2xl"><AlertDialogHeader><AlertDialogTitle>Delete this goal?</AlertDialogTitle><AlertDialogDescription>This removes the goal and its complete payment history. This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep goal</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={removeGoal} disabled={busy}>Delete goal</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </main>
  );
}

function NavButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) { return <button onClick={onClick} className={`flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors ${active ? "bg-surface-raised shadow-sm" : "text-muted-foreground"}`}>{icon}{children}</button>; }
function MobileNav({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) { return <button onClick={onClick} className={`flex min-w-16 flex-col items-center gap-1 text-[11px] ${active ? "text-primary" : "text-muted-foreground"}`}><span className="[&_svg]:size-5">{icon}</span>{label}</button>; }
function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="rounded-2xl bg-surface-raised p-5 shadow-soft"><div className="mb-5 grid size-9 place-items-center rounded-xl bg-muted text-primary [&_svg]:size-4">{icon}</div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>; }

function HistoryList({ history, full = false }: { history: Contribution[]; full?: boolean }) { return <section className={`${full ? "mt-0" : "mt-10"}`}><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-semibold">Recent savings</h2>{!full && <span className="text-sm text-muted-foreground">{history.length} payments</span>}</div><div className="overflow-hidden rounded-2xl bg-surface-raised shadow-soft">{history.length ? history.map((item, index) => <div key={item.id} className={`flex items-center gap-4 p-4 md:px-5 ${index ? "border-t" : ""}`}><div className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-positive"><ArrowDown className="size-4"/></div><div className="min-w-0 flex-1"><p className="font-medium">{item.note || "Daily saving"}</p><p className="text-sm text-muted-foreground">{dayLabel(item.contribution_date)}</p></div><p className="font-semibold text-positive">+ {money(Number(item.amount))}</p></div>) : <div className="p-10 text-center text-sm text-muted-foreground">Your first contribution will appear here.</div>}</div></section>; }

function GoalDialog({ open, onOpenChange, goal, busy, onSave }: { open: boolean; onOpenChange: (v: boolean) => void; goal: Goal; busy: boolean; onSave: (v: FormValues) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); void onSave({ productName: String(data.get("name")), totalAmount: String(data.get("total")), dailyTarget: String(data.get("daily")), durationDays: String(data.get("days")) }); }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-md rounded-2xl"><DialogHeader><DialogTitle>{goal.id === "demo" ? "Create your savings goal" : "Edit savings goal"}</DialogTitle><DialogDescription>Set a pace that feels comfortable. You can change it anytime.</DialogDescription></DialogHeader><form onSubmit={submit} className="grid gap-4"><Field label="Product name" name="name" defaultValue={goal.product_name}/><div className="grid grid-cols-2 gap-3"><Field label="EMI amount" name="total" type="number" min="1" defaultValue={String(goal.total_amount)}/><Field label="Daily amount" name="daily" type="number" min="1" defaultValue={String(goal.daily_target)}/></div><Field label="Number of days" name="days" type="number" min="1" defaultValue={String(goal.duration_days)}/><DialogFooter><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" size="pill" disabled={busy}>{busy ? "Saving…" : "Save goal"}</Button></DialogFooter></form></DialogContent></Dialog>;
}
function PaymentDialog({ open, onOpenChange, target, remaining, busy, onPay }: { open: boolean; onOpenChange: (v: boolean) => void; target: number; remaining: number; busy: boolean; onPay: (n: number) => void }) { const [amount, setAmount] = useState(String(Math.min(target, remaining))); useEffect(() => { if (open) setAmount(String(Math.min(target, remaining))); }, [open, target, remaining]); return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-sm rounded-2xl"><DialogHeader><DialogTitle>Add to your wallet</DialogTitle><DialogDescription>Today's target is {money(target)}. Add that amount or save a little extra.</DialogDescription></DialogHeader><div className="py-5 text-center"><label className="sr-only" htmlFor="payment">Contribution amount</label><div className="flex items-center justify-center text-4xl font-semibold"><span>₹</span><input id="payment" value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min="1" max={remaining} className="w-36 bg-transparent text-center outline-none"/></div><p className="mt-2 text-xs text-muted-foreground">{money(remaining)} remaining</p></div><div className="grid grid-cols-3 gap-2">{[target, target * 2, remaining].map((value, i) => <Button key={i} variant="soft" onClick={() => setAmount(String(Math.min(value, remaining)))}>{i === 2 ? "Finish" : money(Math.min(value, remaining))}</Button>)}</div><Button size="pill" className="mt-2" onClick={() => void onPay(Number(amount))} disabled={busy || Number(amount) <= 0 || Number(amount) > remaining}>{busy ? "Adding…" : `Add ${money(Number(amount) || 0)}`}</Button></DialogContent></Dialog>; }
function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) { return <label className="grid gap-1.5 text-sm font-medium">{label}<input required className="h-11 rounded-xl border bg-background px-3 outline-none transition-shadow focus:ring-2 focus:ring-ring" {...props}/></label>; }