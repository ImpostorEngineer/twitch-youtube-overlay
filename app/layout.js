import "./globals.css";

export const metadata = {
  title: "Twitch YouTube Overlay",
  description: "Local YouTube music player with Twitch requests and OBS overlay",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
