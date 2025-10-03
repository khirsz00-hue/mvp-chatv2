import "./../styles/globals.css";
import { ReactNode } from "react";
export const metadata = { title: "ZenON – ADHD Assistant", description: "Asystenci: Todoist Helper i Six Thinking Hats Turbo" };
export default function RootLayout({ children }:{ children:ReactNode }){
  return (<html lang="pl"><body>{children}</body></html>);
}
