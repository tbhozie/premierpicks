import sgMail from "@sendgrid/mail";
import { NextResponse } from "next/server";
import { adminDb } from "../../../lib/firebaseAdmin.js";

export async function GET(req) {
    const apiKey = process.env.NEXT_PUBLIC_SENDGRID_API_KEY;
    sgMail.setApiKey(apiKey);

    let matchMappings = [
        {
            matchId: '497415',
            homeTeam: "Nottingham Forest FC",
            awayTeam: "AFC Bournemouth",
        },
        {
            matchId: '497416',
            homeTeam: "West Ham United FC",
            awayTeam: "Aston Villa FC",
        },
        {
            matchId: '497417',
            homeTeam: "Brentford FC",
            awayTeam: "Crystal Palace FC",
        },
        {
            matchId: '497418',
            homeTeam: "Chelsea FC",
            awayTeam: "Manchester City FC",
        },
        {
            matchId: '497419',
            homeTeam: "Leicester City FC",
            awayTeam: "Tottenham Hotspur FC",
        },
        {
            matchId: '497413',
            homeTeam: "Everton FC",
            awayTeam: "Brighton & Hove Albion FC",
        }
    ]

    // need to get the predictions for each user
    const users = await adminDb.collection("users").get();
    const userIds = users.docs.map((doc) => doc.id);
    const userNames = users.docs.map((doc) => doc.data().name);

    const userPredictions = await adminDb.collection("predictions").where("userId", "in", userIds).get();
    const userPredictionsData = userPredictions.docs.map((doc) => doc.data());

    // loop through each user and show their predictions with their username, match ids are in the predictions map within userPredictionsData
    let predictionsList = [];

    userIds.forEach((userId, index) => {
        const userName = userNames[index];
        const userPrediction = userPredictionsData.find(pred => pred.userId === userId);
        
        if (userPrediction) {
            let userPredictionText = `${userName}\n`;
            
            matchMappings.forEach(match => {
                const prediction = userPrediction.predictions[match.matchId];
                const result = prediction === 'HOME_WIN' ? match.homeTeam :
                               prediction === 'AWAY_WIN' ? match.awayTeam : 'Draw';
                
                if (match.matchId === '497413') {
                    const homeScores = userPrediction.homeScores?.[match.matchId] || 'N/A';
                    const awayScores = userPrediction.awayScores?.[match.matchId] || 'N/A';
                    userPredictionText += `- ${match.homeTeam} vs ${match.awayTeam} (${result}) [${homeScores}-${awayScores}]\n`;
                } else {
                    userPredictionText += `- ${match.homeTeam} vs ${match.awayTeam} (${result})\n`;
                }
            });
            
            predictionsList.push(userPredictionText);
        }
    });

    console.log(predictionsList.join('\n'));

    // TODO: Use predictionsList to send email or return response
    return NextResponse.json({ message: "Predictions processed" });
}