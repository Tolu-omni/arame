import { loginWithEmail } from "@/backend/lib/auth";

export async function POST(request: Request) {
  const { email, password } = await request.json();
  const { data, error } = await loginWithEmail(email, password);

  if (error) {
    return Response.json({ error }, { status: 401 });
  }

  if (!data) {
    return Response.json({ error: "Login failed." }, { status: 401 });
  }

  return Response.json({ user: data.user, session: data.session });
}
