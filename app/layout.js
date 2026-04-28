export const metadata = {
  title: "SCSI Floor Diagnostic",
  description: "AI floor condition diagnostic tool for Southern Cleaning Services Inc."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}