import StaticPage from '../components/StaticPage.jsx';
import markup from '../legacy/home.html?raw';
import styles from '../legacy/home.css?raw';

export default function HomePage() {
  return <StaticPage markup={markup} script="/legacy/home.js" styles={styles} />;
}
