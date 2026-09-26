import { AppBar, Page } from '../components/AppBar';
import { t } from '../i18n/id';

export function Classifications() {
  return (
    <>
      <AppBar title={t.classifications.title} />
      <Page>{null}</Page>
    </>
  );
}
