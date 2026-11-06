import { useNavigate } from "react-router-dom";
import { ROLE_LABEL } from "@/config";
import { useAuth } from "@/hooks/useAuth";
import Icon from "@/components/ui/Icon";
import { toast } from "@/components/ui/ToastProvider";
import ThemeMenu from "./ThemeMenu";
import NotificationToggle from "./NotificationToggle";
import ActivityNotifications from "./ActivityNotifications";

interface NavbarProps {
  title: string;
}

const Navbar = ({ title }: NavbarProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout(); // clears the session + auth state
    toast.info("You have signed out successfully.", { title: "Signed Out" });
    navigate("/login", { replace: true }); // replace: Back can't return here
  };

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 md:px-6">
      <div className="glass mx-auto flex h-14 max-w-7xl items-center justify-between rounded-full px-3 pl-2 text-fg shadow-card md:px-4">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-gradient text-brand-fg shadow-glow"
            aria-hidden="true"
          >
            <Icon name="book" size={20} />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight sm:text-base">{title}</p>
            <p className="hidden text-xs text-fg-subtle sm:block">
              Customer Support Management
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <ActivityNotifications />
          <NotificationToggle />
          <ThemeMenu />

          {user && (
            <div className="hidden border-l border-line pl-3 text-right sm:block">
              <p className="text-sm font-semibold leading-tight">{user.name}</p>
              <span className="mt-0.5 inline-block rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">
                {ROLE_LABEL[user.role]}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-fg transition-all hover:bg-surface-sunken active:scale-95"
          >
            <Icon name="logout" size={15} />
            <span className="hidden sm:inline">Logout</span>
            <span className="sr-only sm:hidden">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
