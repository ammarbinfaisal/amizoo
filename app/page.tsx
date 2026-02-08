import { redirect } from "next/navigation";
import { getAuthCredentials } from "@/lib/auth";

export default async function Home() {
  const credentials = await getAuthCredentials();
  if (credentials) {
    redirect("/dashboard");
  }
  redirect("/login");
}
