"use client";

import { useEffect, useState } from "react";
import styles from "./SplashScreen.module.css";

export function SplashScreen() {
  const [hidden, setHidden] = useState(false);
  const [displayNone, setDisplayNone] = useState(false);

  useEffect(() => {
    document.body.style.overflowX = "hidden";
    document.body.style.overflowY = "hidden";

    const hideTimer = window.setTimeout(() => {
      setHidden(true);
      window.dispatchEvent(new Event("arame:splash-complete"));
      document.body.style.overflowY = "";
    }, 1800);

    const removeTimer = window.setTimeout(() => {
      setDisplayNone(true);
    }, 2800);

    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(removeTimer);
      document.body.style.overflowY = "";
    };
  }, []);

  if (displayNone) {
    return null;
  }

  return (
    <div id="splash" className={`${styles.splash} ${hidden ? styles.hide : ""}`}>
      <div className={styles.splashContent}>
        <div className={styles.arame}>ARAM{"\u00C8"}</div>
        <div className={styles.arameSub}>- eau de parfum -</div>
        <div className={styles.dividerMain} />
        <div className={styles.houseOf}>HOUSE OF</div>
        <div className={styles.rareFragrance}>RARE FRAGRANCE</div>
        <div className={styles.dividerShort} />
        <div className={styles.tagline}>DEFINE YOUR SCENT</div>
        <div className={styles.ornament}>* * *</div>
      </div>
    </div>
  );
}
