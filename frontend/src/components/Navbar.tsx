import React from 'react';
import { RotateCcw, PlayCircle, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VIEW_TITLES } from './Sidebar';
import { useTheme } from '@/hooks/useTheme';

interface NavbarProps {
  currentView: string;
  onOpenTour: () => void;
  onResetDemo: () => void;
  isResetting: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onOpenTour, onResetDemo, isResetting }) => {
  const { theme, toggle } = useTheme();
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-6">
      <h1 className="text-[17px] font-semibold">{VIEW_TITLES[currentView] || 'Nova'}</h1>

      <div className="flex items-center gap-2">
        {/* Rule: anything simulated is labelled */}
        <span className="badge badge-amber" title="Seeded sample data for the fictional brand Celestial Wear">
          Demo mode · Celestial Wear
        </span>
        <Button variant="outline" size="sm" onClick={onOpenTour} title="Guided walkthrough of the sales flow">
          <PlayCircle /> Guided tour
        </Button>
        <Button variant="outline" size="sm" onClick={onResetDemo} disabled={isResetting}
          title="Delete all data and reload the Celestial Wear demo seed">
          <RotateCcw className={isResetting ? 'spin' : ''} /> {isResetting ? 'Resetting…' : 'Reset demo data'}
        </Button>
        <Button variant="ghost" size="icon" onClick={toggle} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          {theme === 'dark' ? <Sun /> : <Moon />}
        </Button>
      </div>
    </header>
  );
};
