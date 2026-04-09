import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <main
      className="flex min-h-screen items-center justify-center p-6"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% 30%, rgba(79,195,247,0.07) 0%, transparent 60%), #0a0f1a",
      }}
    >
      <SignUp />
    </main>
  );
}
