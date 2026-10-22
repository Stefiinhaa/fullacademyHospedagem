import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login/Login";
import RedefinirSenha from "./pages/Login/redefinirSenha";
import CodigoEmail from "./pages/Login/codigoEmail";
import EscolhaSenha from "./pages/Login/EscolhaSenha";
import ConcluidoSenha from "./pages/Login/concluidoSenha";
import HomeAlunos from "./pages/Alunos/HomeAlunos";
import HomeAdmin from "./pages/Admin/HomeAdmin";
import HomeRoot from "./pages/Root/HomeRoot";
import CadastroUsuarios from "./pages/usuarios/cadastroUsuarios";
import Perfil from "./pages/usuarios/Perfil";
import ProtectedRoute from "./componentes/protegeRota";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/redefinir-senha" element={<RedefinirSenha />} />
        <Route path="/codigo-email" element={<CodigoEmail />} />
        <Route path="/escolha-senha" element={<EscolhaSenha />} />
        <Route path="/concluido-senha" element={<ConcluidoSenha />} />

        <Route
          path="/cadastro-usuarios"
          element={
            <ProtectedRoute tipoEsperado={["admin", "root"]}>
              <CadastroUsuarios />
            </ProtectedRoute>
          }
        />

        <Route
          path="/perfil"
          element={
            <ProtectedRoute>
              <Perfil />
            </ProtectedRoute>
          }
        />

        <Route
          path="/home-alunos"
          element={
            <ProtectedRoute tipoEsperado="aluno">
              <HomeAlunos />
            </ProtectedRoute>
          }
        />
        <Route
          path="/home-admin"
          element={
            <ProtectedRoute tipoEsperado="admin">
              <HomeAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/home-root"
          element={
            <ProtectedRoute tipoEsperado="root">
              <HomeRoot />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
