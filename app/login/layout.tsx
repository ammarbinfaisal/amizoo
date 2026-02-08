import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
  description: "Login to your Amizoo dashboard using your Amizone credentials.",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
