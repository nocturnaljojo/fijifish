import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0f1a] p-6">
      <SignUp />
    </main>
  );
}
