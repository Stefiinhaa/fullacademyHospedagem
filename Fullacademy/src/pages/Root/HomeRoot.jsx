import React, { useState } from "react";
import "./HomeRoot.css";
import Sidebar from "../../componentes/templates/sidebar"; // Ajuste o caminho da Sidebar se necessário
import Navbar from "../../componentes/templates/navbar"; // Ajuste o caminho da Navbar se necessário

function HomeRoot() {
  const [isSidebarNarrow, setIsSidebarNarrow] = useState(true);

  const handleToggleSidebar = () => {
    setIsSidebarNarrow((prev) => !prev);
  };

  const handleCloseSidebar = () => {
    setIsSidebarNarrow(true);
  };

  return (
    <div className={`home-root ${!isSidebarNarrow ? "sidebar-expanded" : ""}`}>
      <Sidebar isNarrow={isSidebarNarrow} onRequestClose={handleCloseSidebar} />
      <Navbar profile="root" onToggleSidebar={handleToggleSidebar} />

      <main className="home-content">
        <h1>Home Root stefani</h1>
        <p>Acesso completo ao sistema stefani santos !!!</p>
      </main>
    </div>
  );
}

export default HomeRoot;
