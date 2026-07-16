import styles from './Loader.module.css'

export default function Loader({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className={styles.loaderWrap}>
      <div className={styles.spinner}>
        <div className={styles.ring1}></div>
        <div className={styles.ring2}></div>
        <div className={styles.ring3}></div>
        <div className={styles.core}>
           <div className={styles.coreGlow}></div>
        </div>
      </div>
      <p className={styles.loadingText}>{text}</p>
    </div>
  )
}
