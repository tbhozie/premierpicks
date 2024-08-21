'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface Standing {
  userId: string;
  username: string;
  points: number;
}

export default function StandingsPage() {
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStandings = async () => {
      try {
        const standingsCollection = collection(db, 'standings');
        const standingsSnapshot = await getDocs(standingsCollection);
        const standingsData = standingsSnapshot.docs.map(doc => ({
          userId: doc.id,
          ...doc.data()
        } as Standing));

        // Sort standings by points in descending order
        standingsData.sort((a, b) => b.points - a.points);

        setStandings(standingsData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching standings:', error);
        setLoading(false);
      }
    };

    fetchStandings();
  }, []);

  if (loading) {
    return <div className="text-center mt-8">Loading standings...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Standings</h1>
      <div className="overflow-x-auto">
        <table className="w-full bg-white shadow-md rounded-lg overflow-hidden">
          <thead className="bg-gray-200">
            <tr>
              <th className="px-4 py-2 text-left text-black">Rank</th>
              <th className="px-4 py-2 text-left text-black">Username</th>
              <th className="px-4 py-2 text-left text-black">Points</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((standing, index) => (
              <tr key={standing.userId} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                <td className="px-4 py-2 text-black">{index + 1}</td>
                <td className="px-4 py-2 text-black">{standing.username}</td>
                <td className="px-4 py-2 text-black">{standing.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
