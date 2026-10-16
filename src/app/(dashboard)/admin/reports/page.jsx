'use client';
import {useState} from 'react';
import Link from 'next/link';
import {ArrowUpRight,ArrowRight,Search,Layers3,BarChart3,Truck,Clock3,Receipt,FileText} from 'lucide-react';
import {usePermission} from '../hooks/usePermission';
import {reportCatalog,canOpenReport} from '@/lib/report-catalog.mjs';
import styles from './reports.module.css';
const icons=[Truck,Clock3,Receipt,FileText];
export default function ReportsPage(){
 const {canView,loading}=usePermission();const [search,setSearch]=useState('');const [type,setType]=useState('all');
 const allowed=reportCatalog.filter(report=>canOpenReport(report,canView));
 const reports=allowed.filter(report=>(type==='all'||(type==='dashboard'?report.dashboard:!report.dashboard))&&`${report.title} ${report.description}`.toLowerCase().includes(search.toLowerCase()));
 return <main className={styles.workspace}>
 <div className={styles.breadcrumb}><Layers3 size={15}/> JAYA GROUP <span>/</span> REPORTS</div>
 <header className={styles.hero}><div><span className={styles.kicker}>YOUR REPORTING WORKSPACE</span><h1>Every operation.<br/><em>A clearer picture.</em></h1><p>Explore performance, track exceptions and get to the details that need your attention.</p></div><div className={styles.heroAside}><BarChart3 size={38}/><strong>{loading?'—':allowed.length}</strong><span>reports available</span><div className={styles.heroRule}/><small>Operations · Rates · Billing</small></div></header>
 <div className={styles.toolbar}><div className={styles.tabs} aria-label="Report categories">{[['all','All reports'],['dashboard','Dashboards'],['report','Detailed reports']].map(([value,label])=><button key={value} onClick={()=>setType(value)} aria-pressed={type===value} className={type===value?styles.activeTab:''}>{label}</button>)}</div><label className={styles.search}><Search size={17}/><input aria-label="Search reports" placeholder="Find a report…" value={search} onChange={event=>setSearch(event.target.value)}/></label></div>
 {loading?<div role="status" className={styles.empty}>Loading your reports…</div>:<><div className={styles.sectionTitle}><h2>{type==='dashboard'?'Live dashboards':type==='report'?'Detailed reports':'Explore your reports'}</h2><span>{reports.length} available</span></div><div className={styles.reportGrid}>{reports.map((report,index)=>{const Icon=icons[reportCatalog.indexOf(report)] || FileText;return <Link href={report.path} key={report.path} className={`${styles.reportCard} ${report.dashboard?styles.dashboardCard:''}`}><div className={styles.cardTop}><span className={styles.reportIcon}><Icon size={23}/></span><span className={styles.kind}>{report.dashboard?'DASHBOARD':'REPORT'}</span><ArrowUpRight size={19}/></div><h3>{report.title}</h3><p>{report.description}</p><div className={styles.cardBottom}><span>{report.dashboard?'Explore dashboard':'Open workspace'}</span><ArrowRight size={18}/></div></Link>;})}</div>{!reports.length&&<div className={styles.empty}>No reports match your search or assigned permissions.</div>}<footer className={styles.footnote}>Reports follow your company access. Open a dashboard to refresh its live data.</footer></>}
 </main>;
}
