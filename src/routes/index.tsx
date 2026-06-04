import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EnergyTracker" },
      { name: "description", content: "Tracker zużycia prądu" },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (loading) return;
    navigate({ to: user ? "/dashboard" : "/auth", replace: true });
  }, [user, loading, navigate]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Zap className="h-12 w-12 text-primary animate-pulse" />
    </div>
  );
}
