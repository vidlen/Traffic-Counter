import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { AppBar } from '../../components/AppBar';
import { loadSettings } from '../../hooks/useSettings';
import { t } from '../../i18n/id';
import { clock } from '../../lib/clock';
import { db } from '../../lib/db';
import { PRESETS } from '../../lib/presets';
import { newSession } from '../../lib/session';
import { isoDate } from '../../lib/time';
import { toast, useWizard } from '../../store';
import type { Session } from '../../types';
import { StepClassification } from './StepClassification';
import { StepInfo } from './StepInfo';
import { StepPosition } from './StepPosition';
import { StepSummary } from './StepSummary';
import { StepTime } from './StepTime';
import { stepErrors } from './validate';

const tw = t.wizard;

export interface StepProps {
  draft: Session;
  patch: (p: Partial<Session>) => void;
  showErrors: boolean;
}

const STEPS = [StepInfo, StepPosition, StepClassification, StepTime, StepSummary];

/** Minta penyimpanan persisten saat sesi pertama dibuat (browser boleh menolak). */
async function requestPersist() {
  if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
    await navigator.storage.persist();
  }
}

export function SessionWizard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const step = Math.min(STEPS.length, Math.max(1, Number(params.get('langkah')) || 1));
  const { draft, mode, setDraft, patch } = useWizard();
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (id) {
        if (draft?.id === id) return;
        const s = await db.sessions.get(id);
        if (cancelled) return;
        if (s?.status === 'DRAFT') setDraft(s, 'edit');
        else navigate('/', { replace: true });
      } else if (!draft || mode !== 'new') {
        const settings = await loadSettings();
        const tpl = (await db.templates.get(settings.defaultTemplateId)) ?? PRESETS[0];
        const now = clock.now();
        if (!cancelled) setDraft(newSession(tpl, settings, crypto.randomUUID(), now, isoDate(now)));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, draft, mode, setDraft, navigate]);

  const title = id ? tw.titleEdit : tw.titleNew;
  if (!draft || (id && draft.id !== id)) return <AppBar title={title} />;

  const Step = STEPS[step - 1];
  const go = (n: number) => {
    setShowErrors(false);
    setParams({ langkah: String(n) });
    window.scrollTo(0, 0);
  };
  const next = () => {
    if (stepErrors(step, draft).length) {
      setShowErrors(true);
      toast(tw.fixErrors, 'danger');
      return;
    }
    go(step + 1);
  };
  const save = async () => {
    const bad = [1, 2, 3, 4].find((n) => stepErrors(n, draft).length);
    if (bad) {
      go(bad);
      setShowErrors(true);
      toast(tw.fixErrors, 'danger');
      return;
    }
    await db.sessions.put({ ...draft, status: 'DRAFT' });
    void requestPersist();
    setDraft(null);
    toast(tw.draftSaved);
    navigate('/');
  };

  return (
    <>
      <AppBar title={title} />
      <div className="mx-auto max-w-xl px-4 pt-4">
        <p className="text-sm text-muted">{tw.stepOf(step, STEPS.length)}</p>
        <h2 className="text-xl font-semibold tracking-tight">{tw.steps[step - 1]}</h2>
        <div className="mt-3 grid grid-cols-5 gap-1" aria-hidden="true">
          {STEPS.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full ${i < step ? 'bg-accent' : 'bg-line'}`} />
          ))}
        </div>
      </div>
      <main className="mx-auto max-w-xl px-4 pt-6 pb-[calc(7rem+env(safe-area-inset-bottom))]">
        <Step draft={draft} patch={patch} showErrors={showErrors} />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-canvas px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-xl gap-2">
          {step > 1 && (
            <button className="btn btn-secondary flex-1" onClick={() => go(step - 1)}>
              {tw.back}
            </button>
          )}
          {step < STEPS.length ? (
            <button className="btn btn-primary flex-[2]" onClick={next}>
              {tw.next}
            </button>
          ) : (
            <button className="btn btn-primary flex-[2]" onClick={() => void save()}>
              {tw.saveDraft}
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
