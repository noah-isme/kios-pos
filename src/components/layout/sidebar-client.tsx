"use client";

import React from "react";
import Sidebar from "./sidebar";

// Simple client wrapper so server components can import a single module
// without using dynamic require or React.lazy. Keeps the Sidebar a
// client component while making the import site straightforward.
export default function SidebarClient() {
  return <Sidebar />;
}
