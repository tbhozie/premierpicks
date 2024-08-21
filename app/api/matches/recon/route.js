export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { adminDb } from "../../../../lib/firebaseAdmin.js";
import { matchday } from "../../../../constants/settings";
import { FieldValue } from "firebase-admin/firestore";

export async function GET() {
  try {
    // 1. Get all users from the users collection
    const usersSnapshot = await adminDb.collection("users").get();
    const users = usersSnapshot.docs.reduce((acc, doc) => {
      acc[doc.id] = doc.data().name;
      return acc;
    }, {});

    // 2. Fetch match data from football-data.org API
    const API_KEY = process.env.NEXT_PUBLIC_FOOTBALL_DATA_API_KEY;
    const response = await fetch(
      `https://api.football-data.org/v4/competitions/PL/matches?matchday=${matchday}`,
      {
        headers: { "X-Auth-Token": API_KEY },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch matches");
    }

    const matchData = await response.json();
    const matchResults = matchData.matches.reduce((acc, match) => {
      acc[match.id] = match.score.winner;
      return acc;
    }, {});

    // 3. Process predictions and update documents
    const predictionsSnapshot = await adminDb.collection("predictions").get();
    const batch = adminDb.batch();
    const pointsUpdates = {};

    const selectedMatchesDoc = await adminDb.collection("matches").doc('matchday' + matchday).get();
    const selectedMatches = selectedMatchesDoc.data();

    for (const doc of predictionsSnapshot.docs) {
      const prediction = doc.data();
      const outcomes = {};
      let points = 0;

      for (const [matchId, userPrediction] of Object.entries(prediction.predictions)) {
        const actualResult = matchResults[matchId];
        let isCorrect = false;

        if (
          (userPrediction === "HOME_WIN" && actualResult === "HOME_TEAM") ||
          (userPrediction === "AWAY_WIN" && actualResult === "AWAY_TEAM") ||
          (userPrediction === "DRAW" && actualResult === "DRAW")
        ) {
          isCorrect = true;
          points += 2;
        } else if (matchId === selectedMatches.matches.special.toString()) {
          points -= 1;
        }

        outcomes[matchId] = isCorrect;
      }

      const docRef = adminDb.collection("predictions").doc(doc.id);
      batch.update(docRef, { outcomes });

      pointsUpdates[prediction.userId] = (pointsUpdates[prediction.userId] || 0) + points;
    }

    // await batch.commit();

    // Update standings
    const standingsSnapshot = await adminDb.collection("standings").get();
    const standingsBatch = adminDb.batch();

    for (const doc of standingsSnapshot.docs) {
      const userId = doc.id;
      if (pointsUpdates[userId]) {
        const standingRef = adminDb.collection("standings").doc(userId);
        standingsBatch.update(standingRef, {
          points: FieldValue.increment(pointsUpdates[userId])
        });
      }
    }

    // await standingsBatch.commit();

    return NextResponse.json({ message: "Reconciliation and standings update completed successfully" });
  } catch (error) {
    console.error("Error in reconciliation:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}