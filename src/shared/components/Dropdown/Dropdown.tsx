import { useState, useContext, createContext, useRef, useEffect, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

// --- Interfaces ---
interface DropdownContextProps {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
}

interface DropdownProps {
  children: ReactNode;
}

interface SubComponentProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

// --- Contexto ---
const DropdownContext = createContext<DropdownContextProps | undefined>(undefined);

const useDropdownContext = () => {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error('Dropdown sub-components must be used within a <Dropdown />');
  }
  return context;
};

// --- Componente Principal ---
export const Dropdown = ({ children }: DropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggle = () => setIsOpen((prev) => !prev);
  const close = () => setIsOpen(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        close();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <DropdownContext.Provider value={{ isOpen, toggle, close }}>
      <div className="relative inline-block text-left" ref={dropdownRef}>
        {children}
      </div>
    </DropdownContext.Provider>
  );
};

// --- Sub-componentes ---

const Trigger = ({ children, className = '', onClick }: SubComponentProps) => {
  const { toggle } = useDropdownContext();
  return (
    <button
      onClick={() => {
        toggle();
        onClick?.();
      }}
      className={twMerge(
        `px-3 py-2 flex text-xs sm:text-sm items-center gap-1 rounded-sm transition-all duration-200 bg-surface border border-hover text-primary hover:bg-hover`,
        className
      )}
    >
      {children}
    </button>
  );
};

const Menu = ({ children, className = '' }: SubComponentProps) => {
  const { isOpen } = useDropdownContext();

  if (!isOpen) return null;

  return (
    <div
      className={`absolute right-0 z-50 mt-2 w-52 origin-top-right rounded-xl shadow-2xl bg-white dark:bg-zinc-800 dark:text-zinc-200 bg-card border border-zinc-500 border-hover ring-1 ring-black/5 overflow-hidden ${className}`}
    >
      <div className="flex flex-col py-1">{children}</div>
    </div>
  );
};

const Item = ({ children, onClick, className = '' }: SubComponentProps) => {
  const { close } = useDropdownContext();

  const handleItemClick = () => {
    if (onClick) onClick();
    close();
  };

  return (
    <button
      onClick={handleItemClick}
      className={`w-full text-left px-4 py-2.5 text-xs sm:text-sm transition-colors
      text-zinc-700 dark:text-zinc-200 hover:bg-hover hover:text-primary ${className}`}
    >
      {children}
    </button>
  );
};

// Asignación de componentes compuestos
Dropdown.Trigger = Trigger;
Dropdown.Menu = Menu;
Dropdown.Item = Item;
