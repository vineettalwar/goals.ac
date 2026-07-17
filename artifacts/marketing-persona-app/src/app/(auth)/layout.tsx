import { AuthPageShell } from "@workspace/app-shell/auth";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthPageShell>{children}</AuthPageShell>;
}
