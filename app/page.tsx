// app/page.tsx
import MatchList from "../components/MatchList";

export default async function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <MatchList />
    </div>
  );
}
