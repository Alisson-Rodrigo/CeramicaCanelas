import Image from 'next/image';
import { ChartColumnIncreasing, Layers, ShieldCheck } from 'lucide-react';
import styles from './login.module.css';

// Set to '/images/login-factory.jpg' when the original industrial photograph is supplied.
const FACTORY_PHOTO_SRC: string | null = null;

export function LoginBrandPanel() {
  return (
    <section className={styles.brandPanel} aria-labelledby="login-institution-title">
      {FACTORY_PHOTO_SRC && (
        <Image src={FACTORY_PHOTO_SRC} alt="" fill sizes="57vw" priority className={styles.factoryPhoto} />
      )}
      <div className={styles.photoOverlay} />
      <div className={styles.brandIdentity}>
        <div className={styles.brandMark}>
          <Image src="/icons/logo.png" alt="" width={200} height={200} priority />
        </div>
        <span className={styles.brandDivider} aria-hidden="true" />
        <p className={styles.brandName}>Cerâmica<strong>Canelas</strong></p>
      </div>
      <div className={styles.brandCopy}>
        <h2 id="login-institution-title">Sistema Integrado<br />de Gestão</h2>
        <span className={styles.orangeRule} aria-hidden="true" />
        <p>Controle, organização e eficiência<br className={styles.desktopBreak} /> para a indústria cerâmica.</p>
      </div>
      <ul className={styles.indicators}>
        <li><Layers aria-hidden="true" /><span>Processos<br />integrados</span></li>
        <li><ChartColumnIncreasing aria-hidden="true" /><span>Mais<br />controle</span></li>
        <li><ShieldCheck aria-hidden="true" /><span>Segurança<br />dos dados</span></li>
      </ul>
      <svg className={styles.orangeSweep} viewBox="0 0 950 160" preserveAspectRatio="none" aria-hidden="true">
        <path fill="#f45100" d="M0 0C165 39 270 132 472 160H0Z" />
        <path fill="#a83b07" d="M0 84C180 108 270 141 425 160H0Z" />
      </svg>
    </section>
  );
}
