import { AppBar, Page } from '../components/AppBar';
import { t } from '../i18n/id';

function Steps({ title, steps }: { title: string; steps: string[] }) {
  return (
    <section className="card p-5">
      <h2 className="font-semibold">{title}</h2>
      <ol className="mt-3 space-y-2">
        {steps.map((s, i) => (
          <li key={s} className="flex gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sunken text-sm font-semibold tabular-nums">
              {i + 1}
            </span>
            <span className="pt-0.5">{s}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function InstallGuide() {
  const g = t.install;
  return (
    <>
      <AppBar title={g.title} />
      <Page>
        <p className="text-ink-2">{g.intro}</p>
        <Steps title={g.android} steps={g.androidSteps} />
        <Steps title={g.ios} steps={g.iosSteps} />
        <section className="space-y-1 px-1">
          <h2 className="font-semibold">{g.offlineTitle}</h2>
          <p className="text-ink-2">{g.offlineBody}</p>
        </section>
        <section className="rounded-xl border border-danger/40 bg-danger-soft p-5">
          <h2 className="font-semibold text-danger">{g.warningTitle}</h2>
          <p className="mt-1">{g.warningBody}</p>
          <p className="mt-3 text-sm text-ink-2">{g.iosNote}</p>
        </section>
      </Page>
    </>
  );
}
