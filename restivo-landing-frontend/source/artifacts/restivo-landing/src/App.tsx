import { useState } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { LiveRestaurantPreview } from './components/LiveRestaurantPreview';
import MarketingLanding, { RequestModal } from './MarketingLanding';
import type { Language } from './content';

function App() {
  const [lang, setLang] = useState<Language>('ar');
  const [liveOpen, setLiveOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);

  return (
    <ErrorBoundary>
      <MarketingLanding
        lang={lang}
        setLang={setLang}
        onTryLive={() => setLiveOpen(true)}
        onRequest={() => setRequestOpen(true)}
      />
      {requestOpen && <RequestModal lang={lang} onClose={() => setRequestOpen(false)} />}
      {liveOpen && <LiveRestaurantPreview lang={lang} onClose={() => setLiveOpen(false)} />}
    </ErrorBoundary>
  );
}

export default App;