import { Ghost, LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function GuestBanner() {
  const { logout } = useAuth();
  return (
    <div className="guest-banner" role="status">
      <Ghost size={15} />
      <span>Guest mode — your data is not saved. <strong>Sign in</strong> to sync your library.</span>
      <button type="button" className="guest-banner-btn" onClick={logout}>
        <LogIn size={13} /> Sign in
      </button>
    </div>
  );
}
