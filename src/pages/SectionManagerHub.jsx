import { Link } from 'react-router-dom';
import styles from '../legacy/home.css?raw';

const managers=[
  {key:'setup',icon:'⚡',title:'Database Setup',description:'Apply the required Supabase schema and migrations before creating content.',href:'/admin/setup'},
  {key:'architecture',icon:'🏗️',title:'Architecture',description:'Web, Android, iOS, testing, backend, nodes and connections.',href:'/admin/architecture'},
  {key:'design',icon:'🎨',title:'System Design',description:'Flows, project structures, dependencies, schemas and explanations.',href:'/admin?resource=sections&page=design'},
  {key:'credentials',icon:'🔐',title:'Credentials',description:'Permission-controlled credential categories and environments.',href:'/admin?resource=credentials'},
  {key:'access',icon:'🌐',title:'Access',description:'Production, QA, development, staging and local environments.',href:'/admin?resource=environments'},
  {key:'downloads',icon:'📥',title:'Downloads',description:'Files, external links, versions, platforms and releases.',href:'/admin?resource=downloads'},
  {key:'frontend',icon:'📱',title:'Frontend',description:'Applications, technologies, modules, setup and code blocks.',href:'/admin?resource=sections&page=frontend'},
  {key:'backend',icon:'⚙️',title:'Backend',description:'Services, infrastructure, modules, base URLs and dependencies.',href:'/admin?resource=sections&page=backend'},
  {key:'apis',icon:'🔌',title:'APIs',description:'Applications, modules, endpoints, request and response details.',href:'/admin?resource=api_applications'},
  {key:'progress',icon:'📊',title:'Progress',description:'Milestones, tasks, status, owners and completion percentage.',href:'/admin?resource=tasks'},
  {key:'media',icon:'🖼️',title:'Media Library',description:'Upload, preview, rename, categorize, tag and manage files.',href:'/admin?resource=media'},
  {key:'tags',icon:'🏷️',title:'Tags',description:'Organize content with tags and categories.',href:'/admin?resource=tags'},
  {key:'revisions',icon:'📜',title:'Revision History',description:'Track changes and revert to previous versions.',href:'/admin?resource=revisions'},
  {key:'activity',icon:'📋',title:'Activity Logs',description:'View system activity and audit trails.',href:'/admin?resource=activity_logs'},
  {key:'roles',icon:'👥',title:'Role Manager',description:'Manage user roles and access levels.',href:'/admin?resource=cms_roles'},
  {key:'permissions',icon:'🔒',title:'Permission Manager',description:'Manage resource-level permissions and access control.',href:'/admin?resource=cms_permissions'},
  {key:'supabase',icon:'⚡',title:'Supabase',description:'Safe project settings, database health, storage and migrations.',href:'/admin?resource=sections&page=supabase'},
];

export default function SectionManagerHub(){return <div className="section-manager-page"><style>{styles}</style><header className="section-manager-header"><div><h1 className="page-title">⚙️ RestroDocs Section Managers</h1><p className="page-sub">Choose a website section to manage its database content and empty preview.</p></div><Link className="btn btn-outline" to="/">← Website</Link></header><div className="section-manager-grid">{managers.map(item=><Link className="card section-manager-card" to={item.href} key={item.key}><span className="section-manager-icon">{item.icon}</span><div><h3>{item.title}</h3><p>{item.description}</p></div><span className="section-manager-arrow">→</span></Link>)}</div></div>}
