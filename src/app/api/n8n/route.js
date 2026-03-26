export async function POST(request) {
  const body = await request.json();

  const response = await fetch(
    "http://localhost:5678/webhook-test/c9e6ed4e-8c51-4fd3-a71a-7449019b624f",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  const data = await response.json();
  return Response.json(data, { status: response.status });
}
