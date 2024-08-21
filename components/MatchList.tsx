// components/MatchList.js
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getDoc, doc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import Login from "./Login";
import Link from "next/link";
import Swal from "sweetalert2";
import { matchday, matchesLocked } from '../constants/settings';

export default function MatchList() {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [selectedMatches, setSelectedMatches] = useState<any>([]);
  const [predictions, setPredictions] = useState({});
  const [homeScores, setHomeScores] = useState({});
  const [awayScores, setAwayScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingPredictions, setExistingPredictions] = useState(null);
  const [docId, setDocId] = useState(null);
  const [role, setRole] = useState(null);

  console.log("selectedMatches", selectedMatches);

  useEffect(() => {
    if (user) {
      fetchUserRole();
      fetchMatches();
      fetchSelectedMatches();
      fetchExistingPredictions();
    }
  }, [user]);

  const fetchUserRole = async () => {
    const userRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      setRole(userData.role);
    } else {
      // show a form to create a username
      const username = await Swal.fire({
        title: "Create a username",
        input: "text",
        inputLabel: "Username",
        inputPlaceholder: "Enter your username",
        showCancelButton: false,
        confirmButtonText: "Submit",
        allowOutsideClick: false,
        allowEscapeKey: false
      }).then((result) => {
        if (result.isConfirmed) {
          setUser(result.value);
        }
      });
    }
  };

  const setUser = async (username) => {
    const userRef = doc(db, "users", user.uid);
    const standingsRef = doc(db, "standings", user.uid);
    const userDoc = await setDoc(userRef, {
      role: "user",
      email: user.email,
      name: username
    });
    const standingsDoc = await setDoc(standingsRef, {
      username: username,
      points: 0
    });
    console.log("User created:", userDoc);
  }

  const fetchExistingPredictions = async () => {
    try {
      const response = await fetch("/api/predictions", {
        headers: {
          "x-user": `${user.uid}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch existing predictions");
      }
      const data = await response.json();
      if (data.predictions) {
        setDocId(data.docId);
        setExistingPredictions(data.predictions);
        setPredictions(data.predictions);
        setHomeScores(data.homeScores);
        setAwayScores(data.awayScores);
      }
    } catch (error) {
      console.error("Error fetching existing predictions:", error);
    }
  };

  const fetchMatches = async () => {
    try {
      const response = await fetch("/api/matches");
      if (!response.ok) {
        throw new Error("Failed to fetch matches");
      }
      const data = await response.json();
      setMatches(data);
      fetchSelectedMatches();
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchSelectedMatches = async () => {
    const response = await fetch("/api/matches/selected");
    const data = await response.json();
    setSelectedMatches(data);
  };

  const handlePredictionChange = (matchId, prediction) => {
    setPredictions((prev) => ({ ...prev, [matchId]: prediction }));
  };

  const handleScoreChange = (matchId, homeScore, awayScore) => {
    setHomeScores((prev) => ({ ...prev, [matchId]: homeScore || prev[matchId] }));
    setAwayScores((prev) => ({ ...prev, [matchId]: awayScore || prev[matchId] }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const method = existingPredictions ? "PATCH" : "POST";
      const documentId = existingPredictions ? docId : null;
      const response = await fetch("/api/predictions", {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({
          userId: user.uid,
          predictions,
          homeScores,
          awayScores,
          docId: documentId,
          matchday: matchday,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("Predictions submitted successfully:", result);
      (
        await Swal.fire({
          title: "Predictions Submitted",
          icon: "success",
        })
      ).isConfirmed && window.location.reload();
    } catch (error) {
      console.error("Error submitting predictions:", error);
      // Add user feedback here (e.g., error message)
    } finally {
      setIsSubmitting(false);
    }
  };

  const checkAllPredictionsMade = () => {
    if (!selectedMatches || !selectedMatches.matches) return false;
    
    const requiredPredictions = [
      ...selectedMatches.matches.regular,
      selectedMatches.matches.special
    ].filter(Boolean);

    if (requiredPredictions.length !== 6) return false;

    return requiredPredictions.every(matchId => 
      predictions[matchId] && 
      (matchId !== selectedMatches.matches.special || 
        (homeScores[matchId] && awayScores[matchId]))
    );
  };

  const MatchCard = ({ match, isSpecial }) => (
    <div
      className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200"
      style={{
        backgroundColor: isSpecial ? "gold" : "gray-100",
      }}
    >
      <div 
        className="px-4 py-3 border-b border-gray-200"
        style={{
          backgroundColor: isSpecial ? "gold" : "gray-100"
        }}
      >
        <p className="font-bold text-lg text-black">
          {match.homeTeam.name} (H) vs {match.awayTeam.name} (A)
        </p>
        <p className="text-sm text-gray-600">
          {new Date(match.utcDate).toLocaleString()}
        </p>
      </div>
      <div className="p-4">
        <div className="mb-4">
          <label
            htmlFor={`prediction-${match.id}`}
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Predict outcome:
          </label>
          <select
            id={`prediction-${match.id}`}
            value={predictions[match.id] || ""}
            onChange={(e) =>
              handlePredictionChange(match.id, e.target.value)
            }
            className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:border-blue-500"
            disabled={matchesLocked}
          >
            <option value="">Select outcome</option>
            <option value="HOME_WIN">{match.homeTeam.name} Win</option>
            <option value="AWAY_WIN">{match.awayTeam.name} Win</option>
            <option value="DRAW">Draw</option>
          </select>
        </div>
        {isSpecial && (
          <div className="mb-4">
            <label htmlFor={`prediction-${match.id}`} className="block text-sm font-medium text-gray-700 mb-2">
              Predict score:
            </label>
            <div className="flex justify-between gap-3">
              <input 
                type="number" 
                id={`home-score-${match.id}`} 
                value={homeScores[match.id] || ""} 
                onChange={(e) => handleScoreChange(match.id, e.target.value, awayScores[match.id])} 
                className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:border-blue-500" 
                placeholder="Home team score" 
                disabled={matchesLocked}
              />
              <input 
                type="number" 
                id={`away-score-${match.id}`} 
                value={awayScores[match.id] || ""} 
                onChange={(e) => handleScoreChange(match.id, homeScores[match.id], e.target.value)} 
                className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:border-blue-500" 
                placeholder="Away team score" 
                disabled={matchesLocked}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (!user) return <Login />;
  if (loading) return <div>Loading matches...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <>
      <h1 className="text-3xl font-bold mb-8 text-center">
        Premier League Matchday {matchday}
      </h1>
      {/* if user is admin then show select matches button */}
      {role && role === "admin" && (
        <div className="mb-4 text-center">
          <button className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-300 ease-in-out">
            <Link href="/matches">Select Matches</Link>
          </button>
        </div>
      )}
      {matchesLocked && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 rounded text-black">
          <p className="font-bold">
            Predictions are locked for this week.
          </p>
        </div>
      )}
      {existingPredictions && (
        <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 rounded text-black">
          <p className="font-bold">
            You submitted predictions for the week.
          </p>
          <p>You can update your predictions below before the start of the first game.</p>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {selectedMatches.length === 0 ? (
          <p className="col-span-full text-center py-8 text-xl">
            Commissioner has not selected any matches for this week.
          </p>
        ) : (
          <>
            {matches
              .filter(match => selectedMatches.matches.regular.includes(match.id))
              .map((match) => (
                <MatchCard key={match.id} match={match} isSpecial={false} />
              ))}
            {matches
              .filter(match => selectedMatches.matches.special === match.id)
              .map((match) => (
                <MatchCard key={match.id} match={match} isSpecial={true} />
              ))}
          </>
        )}
      </div>
      {checkAllPredictionsMade() && !matchesLocked && (
      <div className="flex justify-center mt-8">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-300 ease-in-out ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {isSubmitting
            ? "Submitting..."
            : existingPredictions
              ? "Update Predictions"
              : "Submit Predictions"}
        </button>
      </div>
    )}
    </>
  );
}