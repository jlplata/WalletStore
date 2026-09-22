"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Search, Gift, Plus, ShoppingBag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScannerDialog } from "./scanner-dialog";
import {
  addManualAdjustment,
  findCustomerByQrToken,
  getCustomerPosState,
  recordPurchase,
  redeemReward,
  searchCustomers,
} from "./actions";

type PosState = Awaited<ReturnType<typeof getCustomerPosState>>;
type Branch = { id: string; name: string };

export function PosScreen({ orgId, branches }: { orgId: string; branches: Branch[] }) {
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [customerState, setCustomerState] = useState<PosState>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    { id: string; first_name: string; last_name: string | null; phone: string | null }[]
  >([]);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [pending, startTransition] = useTransition();

  function loadCustomer(customerId: string) {
    startTransition(async () => {
      const state = await getCustomerPosState(orgId, customerId);
      if (!state) {
        toast.error("Cliente no encontrado.");
        return;
      }
      setCustomerState(state);
      setSelectedProgramId(state.programs[0]?.programId ?? null);
      setSearchResults([]);
      setSearchQuery("");
    });
  }

  function handleScan(qrToken: string) {
    startTransition(async () => {
      const customer = await findCustomerByQrToken(orgId, qrToken);
      if (!customer) {
        toast.error("QR no reconocido. Intenta con la búsqueda manual.");
        return;
      }
      loadCustomer(customer.id);
    });
  }

  function handleSearch(q: string) {
    setSearchQuery(q);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    startTransition(async () => {
      const results = await searchCustomers(orgId, q);
      setSearchResults(results);
    });
  }

  const program = customerState?.programs.find((p) => p.programId === selectedProgramId);

  function reset() {
    setCustomerState(null);
    setSelectedProgramId(null);
  }

  function handlePurchaseSubmit() {
    if (!customerState || !program || !branchId) return;
    const amountCents = Math.round(Number(amount) * 100);
    if (!amountCents || amountCents <= 0) {
      toast.error("Ingresa un monto válido.");
      return;
    }
    startTransition(async () => {
      try {
        await recordPurchase(orgId, branchId, customerState.customer.id, program.programId, amountCents);
        toast.success("Compra registrada.");
        setPurchaseOpen(false);
        setAmount("");
        loadCustomer(customerState.customer.id);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "No se pudo registrar la compra.");
      }
    });
  }

  function handleQuickStamp() {
    if (!customerState || !program) return;
    startTransition(async () => {
      try {
        await addManualAdjustment(orgId, customerState.customer.id, program.programId, 1, 0, "Sello manual otorgado en POS");
        toast.success("+1 sello agregado.");
        loadCustomer(customerState.customer.id);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "No se pudo agregar el sello.");
      }
    });
  }

  function handleRedeem(rewardInstanceId: string) {
    if (!branchId || !customerState || !program) return;
    startTransition(async () => {
      try {
        await redeemReward(orgId, branchId, rewardInstanceId, customerState.customer.id, program.programId);
        toast.success("Recompensa canjeada.");
        setRedeemOpen(false);
        if (customerState) loadCustomer(customerState.customer.id);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "No se pudo canjear.");
      }
    });
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      {branches.length > 1 && (
        <Select value={branchId} onValueChange={setBranchId}>
          <SelectTrigger>
            <SelectValue placeholder="Sucursal" />
          </SelectTrigger>
          <SelectContent>
            {branches.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {!customerState ? (
        <div className="space-y-4">
          <ScannerDialog onDetected={handleScan} />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, teléfono o código"
              className="pl-9"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          {searchResults.length > 0 && (
            <Card>
              <CardContent className="divide-y p-0">
                {searchResults.map((r) => (
                  <button
                    key={r.id}
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-accent"
                    onClick={() => loadCustomer(r.id)}
                  >
                    <span>
                      {r.first_name} {r.last_name ?? ""}
                    </span>
                    <span className="text-muted-foreground">{r.phone}</span>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3 pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-semibold">
                    {customerState.customer.first_name} {customerState.customer.last_name ?? ""}
                  </p>
                  {customerState.customer.status === "BLOCKED" && (
                    <Badge variant="destructive">Cliente bloqueado</Badge>
                  )}
                </div>
                <Button variant="ghost" size="icon" onClick={reset}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {customerState.programs.length > 1 && (
                <Select value={selectedProgramId ?? undefined} onValueChange={setSelectedProgramId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {customerState.programs.map((p) => (
                      <SelectItem key={p.programId} value={p.programId}>
                        {p.programName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {program && (
                <>
                  <p className="text-sm text-muted-foreground">{program.programName}</p>
                  <p className="text-3xl font-bold">
                    {program.type === "STAMPS"
                      ? `${program.stampsBalance} / ${program.stampsRequired ?? "–"} sellos`
                      : `${program.pointsBalance} puntos`}
                  </p>
                  {program.availableRewards.length > 0 && (
                    <Badge variant="success">{program.availableRewards.length} recompensa(s) lista(s)</Badge>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {program && (
            <div className="space-y-2">
              <Button
                size="lg"
                className="h-16 w-full text-base"
                onClick={() => setPurchaseOpen(true)}
                disabled={pending || !branchId}
              >
                <ShoppingBag className="h-5 w-5" /> Registrar compra
              </Button>
              {program.type === "STAMPS" && (
                <Button
                  size="lg"
                  variant="outline"
                  className="h-16 w-full text-base"
                  onClick={handleQuickStamp}
                  disabled={pending}
                >
                  <Plus className="h-5 w-5" /> +1 sello
                </Button>
              )}
              <Button
                size="lg"
                variant="outline"
                className="h-16 w-full text-base"
                onClick={() => setRedeemOpen(true)}
                disabled={pending || program.availableRewards.length === 0}
              >
                <Gift className="h-5 w-5" /> Canjear recompensa
              </Button>
            </div>
          )}
        </div>
      )}

      <Dialog open={purchaseOpen} onOpenChange={setPurchaseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar compra</DialogTitle>
            <DialogDescription>Ingresa el monto total de la compra.</DialogDescription>
          </DialogHeader>
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            placeholder="$0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />
          <DialogFooter>
            <Button onClick={handlePurchaseSubmit} disabled={pending} className="w-full">
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={redeemOpen} onOpenChange={setRedeemOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Canjear recompensa</DialogTitle>
            <DialogDescription>Confirma con el cliente antes de canjear. No se puede deshacer.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {program?.availableRewards.map((r) => (
              <Button
                key={r.id}
                variant="outline"
                className="w-full justify-start"
                disabled={pending}
                onClick={() => handleRedeem(r.id)}
              >
                {r.name}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
