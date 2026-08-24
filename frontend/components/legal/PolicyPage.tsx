import { Footer } from "@/frontend/components/shared/Footer";
import { Header } from "@/frontend/components/shared/Header";
import styles from "./policy-page.module.css";

type PolicySection = {
  body: string[];
  title: string;
};

type PolicyPageProps = {
  intro: string;
  sections: PolicySection[];
  title: string;
  updated: string;
};

export function PolicyPage({ intro, sections, title, updated }: PolicyPageProps) {
  return (
    <div className={styles.page}>
      <Header variant="shop" />

      <main className={styles.main}>
        <section className={styles.hero}>
          <span>Arame Policy</span>
          <h1>{title}</h1>
          <p>{intro}</p>
          <small>Last updated: {updated}</small>
        </section>

        <section className={styles.content}>
          {sections.map((section) => (
            <article className={styles.section} key={section.title}>
              <h2>{section.title}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </article>
          ))}
        </section>
      </main>

      <Footer />
    </div>
  );
}
