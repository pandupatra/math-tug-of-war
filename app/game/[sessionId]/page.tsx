import { SessionController } from "@/components/SessionController";

export default async function GamePage({
  params
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <SessionController sessionId={sessionId} />;
}
