import React, { ReactNode } from "react";

type AppLayoutProps = {
  children: ReactNode;
};

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* HEADER */}
      <header className="bg-white shadow p-4">
        <h1 className="text-xl font-bold">Opportunity Hub</h1>
      </header>

      {/* MAIN CONTENT */}
      <main className="p-4 flex-1">{children}</main>

      {/* FOOTER */}
      <footer className="bg-white shadow p-4 text-center text-sm">
        &copy; {new Date().getFullYear()} Opportunity Hub • Earn First Pay Later
      </footer>
    </div>
  );
};

export default AppLayout;
