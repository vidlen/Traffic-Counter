import { AppBar, Page } from '../components/AppBar';
import { t } from '../i18n/id';

export function Settings() {
  return (
    <>
      <AppBar title={t.settings.title} />
      <Page>
        <div className="card flex min-h-14 items-center justify-between px-4">
          <span className="font-medium">{t.settings.version}</span>
          <span className="text-muted tabular-nums">{__APP_VERSION__}</span>
        </div>
      </Page>
    </>
  );
}
