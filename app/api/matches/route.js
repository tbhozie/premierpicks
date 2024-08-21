// app/api/matches/route.js
import { NextResponse } from "next/server";
import { adminDb } from "../../../lib/firebaseAdmin.js";
import { matchday } from "../../../constants/settings";

export async function GET() {
  try {
    const API_KEY = process.env.NEXT_PUBLIC_FOOTBALL_DATA_API_KEY;
    const response = await fetch(
      "https://api.football-data.org/v4/competitions/PL/matches?matchday=" + matchday,
      {
        headers: { "X-Auth-Token": API_KEY },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch matches");
    }

    const data = await response.json();
    return NextResponse.json(data.matches);
  } catch (error) {
    console.error("Error fetching matches:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { matchday, matches } = body;

    const docRef = adminDb.collection("matches").doc(matchday);
    await docRef.set({ matches });

    return NextResponse.json({ message: "Matches saved successfully" });
  } catch (error) {
    console.error("Error saving matches:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
