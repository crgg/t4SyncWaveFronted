/**
 * Componente principal de la aplicación
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';

import { store } from './app/store';
import { ThemeProvider } from './contexts/ThemeContext';
import Router from './routes/Router';
import './App.css';

const queryClient = new QueryClient();

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <BrowserRouter>
            <Router />
          </BrowserRouter>
        </ThemeProvider>
        {import.meta.env.DEV && (
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
        )}
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
