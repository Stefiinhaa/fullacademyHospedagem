import { useState } from "react";

import "./HomeAlunos.css";

import Navbar from "../../componentes/templates/navbar";
import Sidebar from "../../componentes/templates/sidebar";
import { FaArrowRight } from "react-icons/fa";

function HomeAlunos() {
  const [isSidebarNarrow, setIsSidebarNarrow] = useState(true);

  const handleToggleSidebar = () => {
    setIsSidebarNarrow((prev) => !prev);
  };

  const handleCloseSidebar = () => {
    setIsSidebarNarrow(true);
  };

  return (
    <div
      className={`home-alunos ${!isSidebarNarrow ? "sidebar-expanded" : ""}`}
    >
      <Sidebar isNarrow={isSidebarNarrow} onRequestClose={handleCloseSidebar} />

      <Navbar profile="aluno" onToggleSidebar={handleToggleSidebar} />

      <main className="home-content">
        <div className="dashboard-intro">
          <h3>Olá, "Ana Carolina Godoy"!</h3>
          <p style={{ fontSize: "16px" }}>Continue sua Trilha</p>
        </div>
      </main>
    </div>
  );
}

export default HomeAlunos;
