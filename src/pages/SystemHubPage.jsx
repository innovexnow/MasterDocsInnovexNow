import StaticPage from '../components/StaticPage.jsx';
import markup from '../legacy/system-hub.html?raw';
import styles from '../legacy/system-hub.css?raw';

export default function SystemHubPage() {
  return (
    <StaticPage
      markup={markup}
      script="/legacy/system-hub.js"
      styles={styles}
    />
  );
}
