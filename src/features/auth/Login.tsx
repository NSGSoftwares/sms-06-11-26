import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { DEMO_CREDENTIALS, ROLE_HOME, SHOW_DEMO_CREDENTIALS } from "@/config";
import { useAuth } from "@/hooks/useAuth";
import ThemeMenu from "@/components/layout/ThemeMenu";
import Button from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import Icon from "@/components/ui/Icon";
import Notice from "@/components/ui/Notice";
import { toast } from "@/components/ui/ToastProvider";

const Login = () => {
  const { user, loading, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const requestedLocation = (
    location.state as {
      from?: { pathname?: string; search?: string; hash?: string };
    } | null
  )?.from;
  const redirectTo =
    requestedLocation?.pathname &&
    requestedLocation.pathname !== "/login" &&
    requestedLocation.pathname.startsWith("/") &&
    !requestedLocation.pathname.startsWith("//")
      ? `${requestedLocation.pathname}${requestedLocation.search ?? ""}${
          requestedLocation.hash ?? ""
        }`
      : null;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already logged in (e.g. pressed Back after login) -> go to own home page.
  if (!loading && user) {
    return <Navigate to={ROLE_HOME[user.role]} replace />;
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;

    if (!username.trim() || !password) {
      const msg = "Enter your username and password.";
      setError(msg);
      toast.warning(msg, { title: "Login Required" });
      return;
    }

    setSubmitting(true);
    setError(null);

    const result = await login(username, password);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      toast.error(result.error, { title: "Login Failed" });
      return;
    }
    // Keep the requested panel after authentication; otherwise use their role home.
    toast.success(`Welcome back, ${username.trim()}!`, {
      title: "Signed In",
    });
    navigate(redirectTo ?? "/", { replace: true });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-surface-sunken lg:grid lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-nav p-12 text-white lg:flex">
        <div
          aria-hidden="true"
          className="absolute -left-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-brand/40 blur-[110px]"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-32 right-0 h-[26rem] w-[26rem] rounded-full bg-brand-2/30 blur-[120px]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.15] [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:24px_24px]"
        />

        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-gradient text-brand-fg shadow-glow">
            <Icon name="book" size={22} />
          </span>
          <span className="font-display text-lg font-bold">Support Management</span>
        </div>

        <div className="relative max-w-lg">
          <h2 className="font-display text-5xl font-bold leading-[1.05] tracking-tight">
            Every customer, every call, every token in one place.
          </h2>
          <p className="mt-5 text-base text-white/60">
            Log support, track callers, and watch your team's day as it happens.
          </p>
        </div>

        <p className="relative text-xs text-white/40">Customer Support Management System</p>
      </div>

      {/* Form panel */}
      <div className="relative flex min-h-screen items-center justify-center p-4 sm:p-8 lg:min-h-0">
        <div className="absolute right-4 top-4 rounded-2xl border border-line bg-surface p-1.5 shadow-sm">
          <ThemeMenu />
        </div>

        <div className="page-reveal w-full max-w-md">
          <div className="mb-8">
            <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gradient text-brand-fg shadow-glow lg:hidden">
              <Icon name="book" size={22} />
            </span>
            <h1 className="font-display text-4xl font-bold tracking-tight text-fg">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-fg-subtle">
              Sign in to Customer Support Management
            </p>
          </div>

          {error && <Notice type="error" message={error} />}

          <form onSubmit={(e) => void handleSubmit(e)} noValidate>
            <div className="space-y-4">
              <Field label="Username">
                {(control) => (
                  <TextInput
                    {...control}
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    autoFocus
                    placeholder="Enter username"
                  />
                )}
              </Field>

              <Field label="Password">
                {(control) => (
                  <TextInput
                    {...control}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="Enter password"
                  />
                )}
              </Field>
            </div>

            <Button
              type="submit"
              className="mt-6 w-full"
              loading={submitting || loading}
              loadingText={submitting ? "Signing in..." : "Loading..."}
            >
              Login
            </Button>
          </form>


          {SHOW_DEMO_CREDENTIALS && (
          <div className="mt-6 rounded-lg border border-warning/30 bg-warning-soft p-4 text-xs text-warning">
            <p className="font-semibold">Demo credentials (development only)</p>

            <ul className="mt-2 space-y-1">
              {DEMO_CREDENTIALS.map((c) => (
                <li key={c.username}>
                  {c.role}: <span className="font-mono">{c.username}</span> /{" "}
                  <span className="font-mono">{c.password}</span>
                </li>
              ))}
            </ul>

            <p className="mt-2 opacity-90">
              Change these in Admin → Users, and set SHOW_DEMO_CREDENTIALS to
              false in src/config/app.ts.
            </p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default Login;
