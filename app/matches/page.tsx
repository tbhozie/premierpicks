'use client';

import { useState, useEffect } from 'react';
import { useAuth } from "../../contexts/AuthContext";
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { matchday } from '../../constants/settings';

interface Match {
  id: string;
  homeTeam: { name: string };
  awayTeam: { name: string };
  utcDate: string;
  isSelected: boolean;
}

export default function MatchesPage() {
  const [regularMatches, setRegularMatches] = useState<Match[]>([]);
  const [specialMatches, setSpecialMatches] = useState<Match[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const fetchUserRoleAndMatches = async () => {
      if (!loading && user) {
        await fetchUserRole();
      }
    };

    fetchUserRoleAndMatches();
  }, [user, loading]);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/');
      } else if (userRole === 'admin') {
        fetchMatches();
      } else if (userRole !== null && userRole !== 'admin') {
        router.push('/');
      }
    }
  }, [user, loading, userRole, router]);

  const fetchUserRole = async () => {
    if (user) {
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserRole(userData.role);
      } else {
        setUserRole('user'); // Default role if not found
      }
    }
  };

  const fetchMatches = async () => {
    try {
      const response = await fetch("/api/matches");
      if (!response.ok) {
        throw new Error("Failed to fetch matches");
      }
      const data = await response.json();
      const allMatches = data.map(match => ({ ...match, isSelected: false }));
      
      setRegularMatches(allMatches);
      setSpecialMatches(allMatches);
    } catch (error) {
      console.error("Error fetching matches:", error);
    }
  };

  const toggleMatchSelection = (id: string, isSpecial: boolean) => {
    if (isSpecial) {
      setSpecialMatches(specialMatches.map(match => 
        match.id === id ? { ...match, isSelected: !match.isSelected } : { ...match, isSelected: false }
      ));
      setRegularMatches(regularMatches.map(match => 
        match.id === id ? { ...match, isSelected: false } : match
      ));
    } else {
      const selectedCount = regularMatches.filter(match => match.isSelected).length;
      setRegularMatches(regularMatches.map(match => {
        if (match.id === id) {
          if (!match.isSelected && selectedCount >= 5) return match;
          return { ...match, isSelected: !match.isSelected };
        }
        return match;
      }));
      setSpecialMatches(specialMatches.map(match => 
        match.id === id ? { ...match, isSelected: false } : match
      ));
    }
  };

  const saveSelectedMatches = async () => {
    const selectedRegular = regularMatches.filter(match => match.isSelected);
    const selectedSpecial = specialMatches.filter(match => match.isSelected);

    if (selectedRegular.length < 5) {
      alert('Please select at least 5 regular matches.');
      return;
    }

    if (selectedSpecial.length !== 1) {
      alert('Please select at least 1 special match.');
      return;
    }

    const selectedMatchIds = {
      regular: selectedRegular.map(match => match.id),
      special: selectedSpecial[0].id
    };
    // TODO: Implement API call to save selected matches
    const response = await fetch('/api/matches', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authorization': `Bearer ${user.accessToken}`
      },
      body: JSON.stringify({ matchday: 'matchday'+matchday, matches: selectedMatchIds })
    });

    if (!response.ok) {
      throw new Error('Failed to save matches');
    }

    alert('Matches saved successfully');
  };

  if (loading || userRole === null) return <div>Loading...</div>;
  if (!user || userRole !== 'admin') return null;

  const selectedRegularCount = regularMatches.filter(match => match.isSelected).length;
  const selectedSpecialCount = specialMatches.filter(match => match.isSelected).length;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Matchday {matchday} - Select Matches</h1>
      
      <h2 className="text-xl font-semibold mt-6 mb-2">Special Matches (Select 1)</h2>
      <div className="space-y-4">
        {specialMatches.map(match => (
          <div key={match.id} className="flex items-center space-x-4">
            <label htmlFor={match.id} className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={match.id}
                checked={match.isSelected}
                onChange={() => toggleMatchSelection(match.id, true)}
                className="form-checkbox h-5 w-5 text-blue-600"
              />
              <span>{match.homeTeam.name} (H) vs {match.awayTeam.name} (A) - {new Date(match.utcDate).toLocaleString()}</span>
            </label>
          </div>
        ))}
      </div>
      <p>Selected: {selectedSpecialCount}/1</p>

      <h2 className="text-xl font-semibold mt-6 mb-2">Regular Matches (Select 5)</h2>
      <div className="space-y-4">
        {regularMatches.map(match => (
          <div key={match.id} className="flex items-center space-x-4">
            <label htmlFor={match.id + "-regular"} className="flex items-center space-x-2">
              <input
                type="checkbox"
                id={match.id + "-regular"}
                checked={match.isSelected}
                onChange={() => toggleMatchSelection(match.id, false)}
                className="form-checkbox h-5 w-5 text-blue-600"
                disabled={!match.isSelected && selectedRegularCount >= 5 || specialMatches.find(m => m.id === match.id)?.isSelected}
              />
            <span>{match.homeTeam.name} (H) vs {match.awayTeam.name} (A) - {new Date(match.utcDate).toLocaleString()}</span>
            </label>
          </div>
        ))}
      </div>
      <p>Selected: {selectedRegularCount}/5</p>

      <button
        onClick={saveSelectedMatches}
        className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Save Selected Matches
      </button>
    </div>
  );
}