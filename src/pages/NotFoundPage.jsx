import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <main className="main">
      <section className="page active">
        <h1>Page not found</h1>
        <p className="page-sub">The requested documentation page does not exist.</p>
        <Link className="btn btn-primary" to="/">
          Return home
        </Link>
      </section>
    </main>
  );
}
