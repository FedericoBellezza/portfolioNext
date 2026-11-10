// The page itself is a client component and cannot export metadata, so the
// noindex sits here. robots.txt already blocks crawling; this also keeps the
// URL out of results when someone links to it.
export const metadata = {
  title: "Accesso",
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }) {
  return children;
}
