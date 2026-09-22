import Link from "next/link";
import { Wallet } from "lucide-react";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-muted/30 px-4 py-12">
      <Link href="/" className="flex items-center gap-2 font-semibold">
        <Wallet className="h-5 w-5 text-brand" />
        WalletStore
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
