import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Camera, Loader2, Trash2, User } from "lucide-react";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: "Profile — ProView AI" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [careerGoal, setCareerGoal] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        setFullName((data?.full_name as string) ?? "");
        setCareerGoal((data?.career_goal as string) ?? "");
        setAvatarUrl((data?.avatar_url as string) ?? null);
        setLoading(false);
      });
  }, [user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: fullName,
      career_goal: careerGoal,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile updated!");
  };

  const onPickFile = () => fileRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Image must be under 3 MB.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = pub.publicUrl;
      const { error: dbErr } = await supabase.from("profiles").upsert({
        id: user.id,
        avatar_url: url,
        updated_at: new Date().toISOString(),
      });
      if (dbErr) throw dbErr;
      setAvatarUrl(url);
      toast.success("Avatar updated!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    if (!user || !avatarUrl) return;
    setUploading(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        avatar_url: null,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      setAvatarUrl(null);
      toast.success("Avatar removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-3xl font-bold sm:text-4xl">Your <span className="text-gradient">Profile</span></h1>
      <p className="mt-2 text-muted-foreground">Help us tailor your interview practice.</p>

      <div className="mt-8 rounded-2xl border border-border/60 bg-card p-8 shadow-soft">
        <div className="flex flex-wrap items-center gap-5">
          <div className="relative">
            <Avatar className="h-20 w-20 shadow-soft ring-2 ring-border">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt={fullName || "Avatar"} /> : null}
              <AvatarFallback className="bg-gradient-primary text-2xl font-bold text-primary-foreground">
                {fullName ? fullName.charAt(0).toUpperCase() : <User className="h-7 w-7" />}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={onPickFile}
              disabled={uploading}
              aria-label="Change avatar"
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-soft transition-smooth hover:scale-105 disabled:opacity-60"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileChange}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{fullName || "Add your name"}</p>
            <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onPickFile} disabled={uploading}>
                {avatarUrl ? "Change photo" : "Upload photo"}
              </Button>
              {avatarUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeAvatar}
                  disabled={uploading}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="mr-1.5 h-4 w-4" /> Remove
                </Button>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
        ) : (
          <form onSubmit={save} className="mt-8 space-y-5">
            <div>
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
            </div>
            <div>
              <Label htmlFor="goal">Career goal</Label>
              <Textarea
                id="goal"
                value={careerGoal}
                onChange={(e) => setCareerGoal(e.target.value)}
                placeholder="e.g. Land a frontend developer role at a product startup"
                rows={4}
              />
            </div>
            <Button type="submit" className="bg-gradient-primary shadow-soft hover:shadow-elegant" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
