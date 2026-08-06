import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useNavigation } from '../hooks/useNavigation';
import { getPage } from '../services/cms.js';
import DynamicSidebar from '../components/navigation/DynamicSidebar';
import SectionRenderer from '../components/SectionRenderer.jsx';
import PageLoader from '../components/ui/PageLoader';

export default function DynamicPage({ slug: slugProp }) {
  const { slug: slugParam } = useParams();
  const slug = slugProp || slugParam;
  const { menus, settings, loading, error } = useNavigation();
  const [page, setPage] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState(null);

  useEffect(() => {
    if (!slug) return;
    getPage(slug)
      .then((result) => {
        setPage(result);
        setPageLoading(false);
        setPageError(null);
      })
      .catch((err) => {
        setPageError(err.message);
        setPageLoading(false);
      });
  }, [slug]);

  const isLoading = loading || pageLoading;
  const hasError = error || pageError;

  return (
    <div className="app">
      <DynamicSidebar menus={menus} settings={settings} />
      <main className="main">
        <PageLoader
          loading={isLoading}
          error={hasError || null}
          retry={() => window.location.reload()}
          emptyMessage="This page has not been configured yet."
        >
          {!page ? (
            <div className="card">
              <h2>Page not found</h2>
            </div>
          ) : (
            <div className="page active">
              <h1 className="page-title">
                {page.icon} {page.title}
              </h1>
              <p className="page-sub">
                {page.subtitle || page.description}
              </p>
              {page.sections.map((section) => (
                <SectionRenderer key={section.id} section={section} />
              ))}
            </div>
          )}
        </PageLoader>
      </main>
    </div>
  );
}
