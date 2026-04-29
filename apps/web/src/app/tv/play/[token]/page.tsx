import { BostonTvPlayerView } from "@/components/boston-tv/BostonTvPlayerView";

export default async function BostonTvPlayPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <div className="fixed inset-0 bg-black">
      <BostonTvPlayerView token={token} />
    </div>
  );
}
