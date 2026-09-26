import { CheckRow, Segmented } from '../../components/Form';
import { t } from '../../i18n/id';
import { ARMS, type ArmKey, MOVEMENTS, ruasPositions, simpangPositions } from '../../lib/session';
import type { Movement, Position } from '../../types';
import type { StepProps } from './index';
import { positionErrors } from './validate';

const tw = t.wizard;

export function StepPosition({ draft: d, patch, showErrors }: StepProps) {
  const setLabel = (key: string, label: string) =>
    patch({ positions: d.positions.map((p) => (p.key === key ? { ...p, label } : p)) });
  const missing = (ARMS.find((k) => !d.positions.some((p) => p.key === k)) ?? 'BR') as ArmKey;
  const arms = d.positions.length as 3 | 4;
  const counted = d.positions.find((p) => d.countedKeys.includes(p.key));

  const setType = (surveyType: 'RUAS' | 'SIMPANG') =>
    patch(
      surveyType === 'RUAS'
        ? { surveyType, positions: ruasPositions(2), countedKeys: ['A', 'B'] }
        : { surveyType, positions: simpangPositions(4, 'BR'), countedKeys: ['U'] },
    );
  const setSimpang = (n: 3 | 4, miss: ArmKey) => {
    const positions = simpangPositions(n, miss, d.positions);
    const keep = d.countedKeys.filter((k) => positions.some((p) => p.key === k));
    patch({ positions, countedKeys: keep.length ? keep : [positions[0].key] });
  };
  const toggleMovement = (arm: Position, m: Movement, on: boolean) => {
    const movements = MOVEMENTS.filter((x) => (x === m ? on : arm.movements?.includes(x)));
    patch({ positions: d.positions.map((p) => (p.key === arm.key ? { ...p, movements } : p)) });
  };

  const err = showErrors ? positionErrors(d) : [];

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="label">{tw.surveyType}</h2>
        <Segmented
          label={tw.surveyType}
          value={d.surveyType}
          options={[
            ['RUAS', tw.ruas],
            ['SIMPANG', tw.simpang],
          ]}
          onChange={setType}
        />
      </section>

      {d.surveyType === 'RUAS' ? (
        <section className="space-y-3">
          <h2 className="label">{tw.arahCount}</h2>
          <Segmented
            label={tw.arahCount}
            value={d.positions.length}
            options={[
              [1, tw.oneWay],
              [2, tw.twoWay],
            ]}
            onChange={(n) =>
              patch({
                positions: ruasPositions(n as 1 | 2, d.positions),
                countedKeys: n === 1 ? ['A'] : d.countedKeys,
              })
            }
          />
          <ul className="space-y-3">
            {d.positions.map((p) => (
              <li key={p.key} className="card space-y-1 p-3">
                <input
                  aria-label={`${tw.positionName} ${p.key}`}
                  className="input font-semibold"
                  value={p.label}
                  onChange={(e) => setLabel(p.key, e.target.value)}
                />
                <CheckRow
                  label={tw.countHere}
                  checked={d.countedKeys.includes(p.key)}
                  onChange={(on) =>
                    patch({
                      countedKeys: d.positions
                        .map((x) => x.key)
                        .filter((k) => (k === p.key ? on : d.countedKeys.includes(k))),
                    })
                  }
                />
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="space-y-3">
          <h2 className="label">{tw.armCount}</h2>
          <Segmented
            label={tw.armCount}
            value={arms}
            options={[
              [3, tw.arms3],
              [4, tw.arms4],
            ]}
            onChange={(n) => setSimpang(n as 3 | 4, missing)}
          />
          {arms === 3 && (
            <div className="space-y-2">
              <h3 className="label">{tw.missingArm}</h3>
              <Segmented
                label={tw.missingArm}
                value={missing}
                options={ARMS.map((k) => [k, tw.armShort[k]] as const)}
                onChange={(k) => setSimpang(3, k)}
              />
            </div>
          )}
          <ul className="space-y-3">
            {d.positions.map((p) => (
              <li key={p.key} className="card space-y-1 p-3">
                <input
                  aria-label={`${tw.positionName} ${p.key}`}
                  className="input font-semibold"
                  value={p.label}
                  onChange={(e) => setLabel(p.key, e.target.value)}
                />
                <CheckRow
                  type="radio"
                  name="arm"
                  label={tw.countHere}
                  checked={d.countedKeys.includes(p.key)}
                  onChange={() => patch({ countedKeys: [p.key] })}
                />
              </li>
            ))}
          </ul>
          {counted && (
            <div className="card p-3">
              <h3 className="label">{tw.movements}</h3>
              <p className="text-sm text-muted">{counted.label}</p>
              {MOVEMENTS.map((m) => (
                <CheckRow
                  key={m}
                  label={tw.movementName[m]}
                  checked={!!counted.movements?.includes(m)}
                  onChange={(on) => toggleMovement(counted, m, on)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {err.map((e) => (
        <p key={e} className="text-sm font-semibold text-danger">
          {e}
        </p>
      ))}
    </div>
  );
}
