import { useState } from "react";

import "./HomeAdmin.css";

import Navbar from "../../componentes/templates/navbar";
import Sidebar from "../../componentes/templates/sidebar";

function HomeAdmin() {
  const [isSidebarNarrow, setIsSidebarNarrow] = useState(true);

  const handleToggleSidebar = () => {
    setIsSidebarNarrow((prev) => !prev);
  };

  const handleCloseSidebar = () => {
    setIsSidebarNarrow(true);
  };

  return (
    <div className={`home-admin ${!isSidebarNarrow ? "sidebar-expanded" : ""}`}>
      <Sidebar isNarrow={isSidebarNarrow} onRequestClose={handleCloseSidebar} />
      <Navbar profile="admin" onToggleSidebar={handleToggleSidebar} />

      <main className="home-content">
        <h1>Olá, Ana!</h1>
        <p>Confira o panorama atual das suas turmas e atividades.</p>
      </main>
    </div>
  );
}

export default HomeAdmin;
