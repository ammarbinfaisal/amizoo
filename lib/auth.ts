import { cookies } from "next/headers";

export async function getAuthCredentials() {
  const cookieStore = await cookies();
  const auth = cookieStore.get("amizone_auth")?.value;
  if (!auth) return null;

  try {
    const decoded = atob(auth);
    const [username, password] = decoded.split(":");
    return { username, password };
  } catch {
    return null;
  }
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("amizone_auth");
}
