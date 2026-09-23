import AppLayout from "@cloudscape-design/components/app-layout";
import SideNavigation from "@cloudscape-design/components/side-navigation";
import { useEffect, useState } from "react";
import { type FrankApi, frank } from "./frank";
import { Overview } from "./pages/Overview";
import { Tools } from "./pages/Tools";

const PAGES = { "#/": "Overview", "#/tools": "Tools" } as const;
type Route = keyof typeof PAGES;

function currentRoute(): Route {
  return window.location.hash in PAGES ? (window.location.hash as Route) : "#/";
}

// Hash routing: Frank serves only static files at /, so every path must
// resolve to index.html without server-side route handling.
export function App({ api = frank }: { api?: FrankApi }) {
  const [route, setRoute] = useState<Route>(currentRoute);

  useEffect(() => {
    const onHash = () => setRoute(currentRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return (
    <AppLayout
      toolsHide
      navigation={
        <SideNavigation
          header={{ href: "#/", text: "Frank" }}
          activeHref={route}
          items={Object.entries(PAGES).map(([href, text]) => ({ type: "link", href, text }))}
        />
      }
      content={route === "#/tools" ? <Tools api={api} /> : <Overview api={api} />}
    />
  );
}
