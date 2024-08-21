import "./globals.css";
import { AuthProvider } from "../contexts/AuthContext";
import Nav from "../components/Nav";

import type { Metadata } from 'next'
 
export const metadata: Metadata = {
  title: 'Premier League Pickem',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Nav />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
