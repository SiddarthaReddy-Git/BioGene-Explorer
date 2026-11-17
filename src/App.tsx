import { useState } from 'react';
import { AppShell } from './components/Layout/AppShell';
import { AboutPage } from './pages/AboutPage';
import { DashboardPage } from './pages/DashboardPage';
import { DatasetExplorerPage } from './pages/DatasetExplorerPage';
import { DiseaseExplorerPage } from './pages/DiseaseExplorerPage';
import { GeneDetailsPage } from './pages/GeneDetailsPage';
import { HomePage } from './pages/HomePage';
import { NetworkAnalysisPage } from './pages/NetworkAnalysisPage';
import { NetworkVisualizationPage } from './pages/NetworkVisualizationPage';
import type { PageId } from './types/bio';

export default function App() {
  const [activePage, setActivePage] = useState<PageId>('home');
  const [selectedDiseaseId, setSelectedDiseaseId] = useState<string>('ALL');
  const [selectedGeneId, setSelectedGeneId] = useState<string>('7157');

  const handleOpenGene = (geneId: string) => {
    setSelectedGeneId(geneId);
    setActivePage('gene-details');
  };

  const handleGenerateNetwork = (diseaseId: string) => {
    setSelectedDiseaseId(diseaseId);
    setActivePage('network');
  };

  const primaryActionLabel =
    activePage === 'network' ? 'Dataset Explorer' : 'Explore Network';
  const handlePrimaryAction = () => {
    if (activePage === 'network') {
      setActivePage('dataset');
    } else {
      setActivePage('network');
    }
  };

  return (
    <AppShell
      activePage={activePage}
      onNavigate={setActivePage}
      onPrimaryAction={handlePrimaryAction}
      primaryActionLabel={primaryActionLabel}
    >
      {activePage === 'home' && (
        <HomePage
          onNavigate={setActivePage}
          onExploreDisease={handleGenerateNetwork}
        />
      )}
      {activePage === 'dashboard' && (
        <DashboardPage onOpenGene={handleOpenGene} onNavigate={setActivePage} />
      )}
      {activePage === 'diseases' && (
        <DiseaseExplorerPage
          selectedDiseaseId={selectedDiseaseId}
          onSelectDiseaseId={setSelectedDiseaseId}
          onGenerateNetwork={handleGenerateNetwork}
          onOpenGene={handleOpenGene}
        />
      )}
      {activePage === 'network' && (
        <NetworkVisualizationPage
          initialDiseaseId={selectedDiseaseId}
          onOpenGene={handleOpenGene}
        />
      )}
      {activePage === 'gene-details' && (
        <GeneDetailsPage
          selectedGeneId={selectedGeneId}
          onSelectGeneId={setSelectedGeneId}
          onExploreDiseaseNetwork={handleGenerateNetwork}
        />
      )}
      {activePage === 'analysis' && (
        <NetworkAnalysisPage onOpenGene={handleOpenGene} />
      )}
      {activePage === 'dataset' && (
        <DatasetExplorerPage onOpenGene={handleOpenGene} />
      )}
      {activePage === 'about' && <AboutPage />}
    </AppShell>
  );
}
