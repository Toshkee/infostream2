"use client";

import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Dict } from "@/lib/dictionaries";
import CodeTerminal, { type CodeSnippet } from "@/components/effects/CodeTerminal";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const CSHARP_SNIPPETS: CodeSnippet[] = [
  {
    filename: "Services/SettlementService.cs",
    code: `public sealed class SettlementService : ISettlementService
{
    private readonly LedgerDbContext _db;
    private readonly ILogger<SettlementService> _log;

    public SettlementService(LedgerDbContext db, ILogger<SettlementService> log)
    {
        _db = db;
        _log = log;
    }

    public async Task<BatchResult> SettleAsync(
        Guid batchId, CancellationToken ct)
    {
        var txns = await _db.Transactions
            .Where(t => t.BatchId == batchId && t.Status == TxStatus.Pending)
            .OrderBy(t => t.CreatedAt)
            .ToListAsync(ct);

        await using var tx = await _db.Database.BeginTransactionAsync(ct);
        foreach (var t in txns)
        {
            t.Status = TxStatus.Settled;
            t.SettledAt = DateTime.UtcNow;
            _db.Ledger.Add(new LedgerEntry(t.Id, t.Amount, t.Currency));
        }

        await _db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        _log.LogInformation("Batch {Id} settled · {N} txn", batchId, txns.Count);
        return new BatchResult(batchId, txns.Count, txns.Sum(t => t.Amount));
    }
}`,
    runCmd: "$ dotnet run -- batch=BX-2026-001",
    output: [
      "info: LedgerDbContext[0]",
      "      Opened connection to ledger@10.0.4.12 in 18ms",
      "info: SettlementService[0]",
      "      Loaded 247 pending transactions",
      "info: SettlementService[0]",
      "      Batch BX-2026-001 settled · 247 txn",
      "info: SettlementService[0]",
      "      Total: €1,284,902.41 · committed in 142ms",
      "",
      "Done. Process exited with code 0.",
    ],
  },
  {
    filename: "Api/TransferEndpoint.cs",
    code: `app.MapPost("/api/v1/transfer", async (
    TransferRequest req,
    LedgerDbContext db,
    IIdempotencyStore idem,
    CancellationToken ct) =>
{
    if (await idem.HasSeenAsync(req.IdempotencyKey, ct))
        return Results.Ok(await idem.GetAsync(req.IdempotencyKey, ct));

    var src = await db.Accounts.FindAsync(new object[] { req.From }, ct);
    var dst = await db.Accounts.FindAsync(new object[] { req.To }, ct);
    if (src is null || dst is null) return Results.NotFound();
    if (src.Balance < req.Amount)
        return Results.BadRequest(new { error = "INSUFFICIENT_FUNDS" });

    src.Debit(req.Amount);
    dst.Credit(req.Amount);
    await db.SaveChangesAsync(ct);

    var result = new { id = Guid.NewGuid(), status = "POSTED" };
    await idem.StoreAsync(req.IdempotencyKey, result, ct);
    return Results.Ok(result);
})
.RequireAuthorization("treasury.write")
.WithName("PostTransfer");`,
    runCmd: "$ curl -X POST https://api.infostream.me/api/v1/transfer -d @transfer.json",
    output: [
      "> HTTP/2 200",
      "> content-type: application/json",
      "> x-request-id: 8e2c1f4a-7b51-4d33-9c12-ab8f0e5c2d11",
      "",
      "{",
      '  "id": "8e2c1f4a-7b51-4d33-9c12-ab8f0e5c2d11",',
      '  "status": "POSTED",',
      '  "amount": 14250.00,',
      '  "currency": "EUR"',
      "}",
      "",
      "elapsed: 47ms",
    ],
  },
];

const SQL_SNIPPETS: CodeSnippet[] = [
  {
    filename: "queries/daily_reconcile.sql",
    code: `-- Daily reconciliation: per-account running balance + overdraw flag
WITH daily AS (
    SELECT
        account_id,
        DATE(posted_at) AS day,
        SUM(CASE WHEN type = 'DR' THEN amount ELSE 0 END) AS debits,
        SUM(CASE WHEN type = 'CR' THEN amount ELSE 0 END) AS credits
    FROM ledger_entries
    WHERE posted_at >= NOW() - INTERVAL '30 days'
    GROUP BY account_id, DATE(posted_at)
),
running AS (
    SELECT
        account_id, day, debits, credits,
        SUM(credits - debits) OVER (
            PARTITION BY account_id ORDER BY day
        ) AS balance
    FROM daily
)
SELECT
    a.account_no, r.day, r.debits, r.credits, r.balance,
    CASE WHEN r.balance < 0 THEN 'OVERDRAWN' ELSE 'OK' END AS status
FROM running r
JOIN accounts a ON a.id = r.account_id
WHERE r.day = CURRENT_DATE
ORDER BY r.balance ASC;`,
    runCmd: "$ run queries/daily_reconcile.sql",
    output: [
      " account_no   |    day     |   debits  |  credits  |   balance  | status",
      "--------------+------------+-----------+-----------+------------+-----------",
      " ME25-001-042 | 2026-05-27 |   18,420  |   18,420  |   124,508  | OK",
      " ME25-001-118 | 2026-05-27 |   42,001  |   33,099  |    -8,902  | OVERDRAWN",
      " ME25-001-205 | 2026-05-27 |    9,840  |   12,150  |    47,310  | OK",
      " ME25-001-318 | 2026-05-27 |   71,250  |   71,250  |   902,144  | OK",
      "",
      "(4 rows)",
      "Time: 41.832 ms",
    ],
  },
  {
    filename: "queries/fx_normalize.sql",
    code: `-- Convert today's settled transactions into EUR using the latest applicable rate
SELECT
    t.txn_id, t.posted_at, t.amount, t.currency,
    fx.rate AS fx_to_eur,
    ROUND(t.amount * fx.rate, 2) AS amount_eur
FROM transactions t
LEFT JOIN LATERAL (
    SELECT rate FROM fx_rates
    WHERE base_ccy = t.currency
      AND quote_ccy = 'EUR'
      AND valid_from <= t.posted_at
    ORDER BY valid_from DESC
    LIMIT 1
) fx ON TRUE
WHERE t.posted_at >= CURRENT_DATE
  AND t.status = 'SETTLED'
ORDER BY t.posted_at DESC
LIMIT 50;`,
    runCmd: "$ run queries/fx_normalize.sql",
    output: [
      "  txn_id  | currency | fx_to_eur | amount_eur",
      "----------+----------+-----------+------------",
      " 8a3f02e1 | USD      |   0.9241  |   1,848.20",
      " 8a3f02e2 | RSD      |   0.0085  |     127.50",
      " 8a3f02e3 | EUR      |   1.0000  |   2,440.00",
      " 8a3f02e4 | GBP      |   1.1782  |   3,534.60",
      "",
      "(50 rows)",
      "Time: 18.502 ms",
    ],
  },
];

export default function LiveFeed({ dict }: { dict: Dict }) {
  const lf = dict.livefeed;
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  // Pause typing when off-screen
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => setActive(e.isIntersecting)),
      { threshold: 0, rootMargin: "200px 0px 200px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useGSAP(
    () => {
      gsap.to(".lf-h2", {
        clipPath: "inset(0 0% 0 0)",
        duration: 1.2,
        ease: "power4.out",
        scrollTrigger: { trigger: ".lf-h2", start: "top 85%" },
      });
    },
    { scope: ref }
  );

  return (
    <section
      id="livefeed"
      ref={ref}
      className="relative bg-[var(--bg-inset)] text-white py-28 lg:py-36 overflow-hidden"
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse at center, black 35%, transparent 80%)",
        }}
      />

      <div className="relative mx-auto max-w-[1280px] px-6 lg:px-10">
        <div className="max-w-2xl">
          <div className="mono text-[11px] tracking-[0.25em] uppercase text-[var(--brand-teal-bright)] flex items-center gap-2">
            <span className="h-px w-6 bg-[var(--brand-teal-bright)]" />
            {lf.eyebrow}
          </div>
          <h2 className="lf-h2 mask-reveal mt-5 text-[clamp(1.9rem,3.6vw,3rem)] leading-[1.05] tracking-[-0.02em] font-medium">
            {lf.title}
          </h2>
          <p className="mt-6 text-white/65 leading-relaxed max-w-md text-[15.5px]">
            {lf.body}
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6">
          <CodeTerminal
            title=".NET 8 · C#"
            lang="csharp"
            snippets={CSHARP_SNIPPETS}
            active={active}
          />
          <CodeTerminal
            title="SQL"
            lang="sql"
            snippets={SQL_SNIPPETS}
            active={active}
          />
        </div>

        <div className="mt-4 mono text-[10px] uppercase tracking-[0.22em] text-white/35">
          {lf.host} · {lf.hint}
        </div>
      </div>
    </section>
  );
}
