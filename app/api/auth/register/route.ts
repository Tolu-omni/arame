import { registerWithEmail } from "@/backend/lib/auth";

export async function POST(request: Request) {
  const { email, password } = await request.json();
  const { data, error } = await registerWithEmail(email, password);

  if (error) {
    return Response.json({ error }, { status: 400 });
  }

  if (!data) {
    return Response.json({ error: "Registration failed." }, { status: 400 });
  }

  return Response.json({ user: data.user, session: data.session });
}
