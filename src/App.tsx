import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import HistorialTable from './components/HistorialTable'
import NuevoRegistro from './components/NuevoRegistro'

function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-slate-100">
        <Sidebar />
        <main className="flex-1 p-8 overflow-auto">
          <Routes>
            <Route path="/" element={<HistorialTable />} />
            <Route path="/nuevo" element={<NuevoRegistro />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App