export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { adminDb } from "../../../../../lib/firebaseAdmin.js";
import { matchday } from "../../../../../constants/settings";
import { FieldValue } from "firebase-admin/firestore";

export async function GET(request, { params }) {
    try {
        const id = params.id;
        const API_KEY = process.env.NEXT_PUBLIC_FOOTBALL_DATA_API_KEY;
        const response = await fetch(
          `https://api.football-data.org/v4/matches/${id}`,
          {
            headers: { "X-Auth-Token": API_KEY },
          }
        );
    
        if (!response.ok) {
          throw new Error("Failed to fetch match");
        }

        const matchData = await response.json();
        const matchWinner = matchData.score.winner;

        if (matchWinner === null) {
            return NextResponse.json({ message: "Match not finished yet" });
        }

        const selectedMatchesDoc = await adminDb.collection("matches").doc('matchday' + matchday).get();
        const selectedMatches = selectedMatchesDoc.data();

        const predictionsSnapshot = await adminDb.collection("predictions").get();
        const batch = adminDb.batch();
        const pointsUpdates = {};

        for (const doc of predictionsSnapshot.docs) {
            const prediction = doc.data();
            const userPrediction = prediction.predictions[id];
            let isCorrect = false;
            let points = 0;

            if (
                (userPrediction === "HOME_WIN" && matchWinner === "HOME_TEAM") ||
                (userPrediction === "AWAY_WIN" && matchWinner === "AWAY_TEAM") ||
                (userPrediction === "DRAW" && matchWinner === "DRAW")
            ) {
                isCorrect = true;
                points += 2;
            } else if (id === selectedMatches.matches.special.toString()) {
                points -= 1;
            }

            const docRef = adminDb.collection("predictions").doc(doc.id);
            batch.update(docRef, { [`outcomes.${id}`]: isCorrect });

            pointsUpdates[prediction.userId] = (pointsUpdates[prediction.userId] || 0) + points;
        }

        await batch.commit();

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

        await standingsBatch.commit();

        return NextResponse.json({ message: "Predictions and standings updated successfully" });
    } catch (error) {
        console.error("Error updating predictions and standings:", error);
        return NextResponse.json({ error: "Failed to update predictions and standings" }, { status: 500 });
    }
}