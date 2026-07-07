import styles from './Loader.module.css'

export default function Loader({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className={styles.loaderWrap}>
      <div className={styles.spinner}>
        <div className={styles.glow} />
        <div className={styles.core} />
      </div>
      <p className={styles.loadingText}>{text}</p>
    </div>
  )
}
