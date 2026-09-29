import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Legacy Profile settings URL — content now lives under Account → My Profile. */
export default function ProfilePage() {
  redirect("/account/profile");
}
