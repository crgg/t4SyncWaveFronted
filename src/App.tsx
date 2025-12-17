/**
 * Componente principal de la aplicación
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './app/store';
import { HomePage } from './pages/HomePage';
import { HostPage } from './pages/HostPage';
import { ListenerPage } from './pages/ListenerPage';
import './App.css';

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/host/:sessionId" element={<HostPage />} />
          <Route path="/listener/:sessionId" element={<ListenerPage />} />
        </Routes>
      </BrowserRouter>
    </Provider>
  );
}

export default App;

