// dont cache this route
export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { adminDb } from "../../../../lib/firebaseAdmin.js";
import { matchday } from "../../../../constants/settings";

export async function GET() {
    try {
        const response = await adminDb.collection("matches").doc('matchday'+matchday).get();
        if (!response.exists) {
            return NextResponse.json([]);
        }
        const data = response.data();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error fetching selected matches:", error);
        return NextResponse.json({ error: "Failed to fetch selected matches" }, { status: 500 });
    }
}