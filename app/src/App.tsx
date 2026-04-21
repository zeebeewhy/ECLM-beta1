import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getConfig } from '@/engine/llm';
import Layout from '@/components/Layout';
import HomePage from '@/components/HomePage';
import FreeExpression from '@/components/FreeExpression';
import ConstructionImplant from '@/components/ConstructionImplant';
import ProgressPage from '@/components/ProgressPage';
import SettingsPage from '@/components/SettingsPage';

export default function App() {
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    setHasKey(!!getConfig().apiKey);
  }, []);

  if (!hasKey) {
    return <SettingsPage onConfigured={() => setHasKey(true)} />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/free" element={<FreeExpression />} />
        <Route path="/implant/:id" element={<ConstructionImplant />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/settings" element={<SettingsPage onConfigured={() => {}} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
}
