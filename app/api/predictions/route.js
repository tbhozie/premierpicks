// app/api/predictions/route.js
import { NextResponse } from "next/server";
import { adminDb } from "../../../lib/firebaseAdmin.js";
import { matchday } from "../../../constants/settings";

export async function GET(req) {
  try {
    const authHeader = req.headers.get("x-user");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = authHeader;

    console.log("userid", userId);

    const querySnapshot = await adminDb
      .collection("predictions")
      .where("userId", "==", userId)
      .where("matchday", "==", matchday)
      .limit(1)
      .get();

    if (querySnapshot.empty) {
      return NextResponse.json({ predictions: null, homeScores: null, awayScores: null });
    }

    const docId = querySnapshot.docs[0].id;
    const userPredictions = querySnapshot.docs[0].data().predictions;
    const userHomeScores = querySnapshot.docs[0].data().homeScores;
    const userAwayScores = querySnapshot.docs[0].data().awayScores;
    return NextResponse.json({
      predictions: userPredictions,
      homeScores: userHomeScores,
      awayScores: userAwayScores,
      docId,
    });
  } catch (error) {
    console.error("Error fetching predictions:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { predictions, userId, homeScores, awayScores, matchday } = await req.json();
    const docRef = await adminDb.collection("predictions").add({
      userId,
      predictions,
      homeScores,
      awayScores,
      matchday,
    });

    return NextResponse.json({ success: true, id: docRef.id }, { status: 200 });
  } catch (error) {
    console.error("Error in API route:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

export async function PATCH(req) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { predictions, docId, matchday, homeScores, awayScores } = await req.json();
    const docRef = await adminDb
      .collection("predictions")
      .doc(docId)
      .update({ predictions, homeScores, awayScores, matchday });

    return NextResponse.json({ success: true, id: docRef.id }, { status: 200 });
  } catch (error) {
    console.error("Error in API route:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
