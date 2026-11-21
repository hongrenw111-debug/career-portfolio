(function () {
  const SVG_NS = "http://www.w3.org/2000/svg";

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function svgEl(tag, attrs) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      node.setAttribute(k, String(v));
    }
    return node;
  }

  function fmtPct(rate) {
    return `${(rate * 100).toFixed(1)}%`;
  }

  function fmtCny(val) {
    return val === null || val === undefined ? "不适用" : `¥${Number(val).toFixed(2)}`;
  }

  function fmtKappa(val) {
    return Number(val).toFixed(3);
  }

  function readThemeTokens() {
    const cs = getComputedStyle(document.documentElement);
    const get = (name, fallback) => cs.getPropertyValue(name).trim() || fallback;
    return {
      paper: get("--surface-raised", "#fbfaf6"),
      ink: get("--ink", "#161916"),
      inkSoft: get("--ink-soft", "#2e332e"),
      inkMuted: get("--ink-muted", "#50554f"),
      line: get("--line", "#d4d0c4"),
      lineStrong: get("--line-strong", "#9c9788"),
      accent: get("--accent", "#145c46"),
      fail: get("--fail", "#9a1f28"),
      seriesBlue: get("--series-blue", "#214975"),
      seriesUmber: get("--series-umber", "#7c4b14"),
      fontMono: get("--font-mono", "monospace"),
      fontBody: get("--font-body", "sans-serif"),
    };
  }

  function positionTooltipAt(x, y, lines) {
    const tip = document.getElementById("chartTooltip");
    tip.replaceChildren();
    lines.forEach((line, idx) => {
      const div = el("div", null, line);
      if (idx === 0) div.style.fontWeight = "700";
      tip.appendChild(div);
    });
    tip.hidden = false;
    const left = Math.max(8, Math.min(window.innerWidth - 296, x + 12));
    const top = Math.max(8, Math.min(window.innerHeight - 120, y - 16));
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }

  function showTooltip(evt, lines) {
    positionTooltipAt(evt.clientX, evt.clientY, lines);
  }

  function showFocusTooltip(target, lines) {
    const rect = target.getBoundingClientRect();
    positionTooltipAt(rect.right, rect.top, lines);
  }

  function hideTooltip() {
    document.getElementById("chartTooltip").hidden = true;
  }

  function renderHero(data) {
    const strip = document.getElementById("heroMetaPills");
    strip.replaceChildren();
    const judgesDd = document.createElement("dd");
    data.l2.judges.forEach((j, idx) => {
      if (idx > 0) judgesDd.appendChild(document.createTextNode(" + "));
      judgesDd.appendChild(el("span", "nowrap", j.label));
    });

    const staticItems = [
      { label: "运行批次", value: data.meta.runId },
      { label: "有效生成", value: `${data.meta.validGenerations} / ${data.meta.totalGenerations}` },
      { label: "牌价快照", value: data.meta.priceSnapshotDate },
    ];
    for (const item of staticItems) {
      const wrap = el("div", null, null);
      wrap.appendChild(el("dt", null, item.label));
      wrap.appendChild(el("dd", null, item.value));
      strip.appendChild(wrap);
    }
    const judgeWrap = el("div", null, null);
    judgeWrap.appendChild(el("dt", null, "双异构裁判"));
    judgeWrap.appendChild(judgesDd);
    strip.appendChild(judgeWrap);

    const grid = document.getElementById("findingsGrid");
    const dsLift = data.l1.v2.promptLifts.find((p) => p.modelId === "deepseek-v4.1-flash");
    const dsCostDrop =
      dsLift && dsLift.effectiveCostReductionPct !== null
        ? `-${dsLift.effectiveCostReductionPct.toFixed(1)}%`
        : "-50.6%";
    const geminiL3 = data.l3Human.perJudge.find((j) => j.judgeId === "judge-gemini-4-neon");

    const consensusBox = el("div", "ledger-cell");
    consensusBox.appendChild(el("div", "ledger-value", fmtPct(data.l2.crossJudge.nonFlippedAgreementRate)));
    const consensusLbl = el("div", "ledger-label", "双裁判共识一致率（26 对，");
    consensusLbl.appendChild(el("span", "nowrap", `κ = ${fmtKappa(data.l2.crossJudge.nonFlippedKappa)}`));
    consensusLbl.appendChild(document.createTextNode("）"));
    consensusBox.appendChild(consensusLbl);
    consensusBox.appendChild(el("div", "ledger-note", "Grok 4.7 位置翻转率 32.5%，剔除翻转后双裁判达到 100.0% 一致。"));

    const leadBox = el("div", "ledger-cell ledger-cell-lead");
    leadBox.appendChild(el("div", "ledger-value", dsCostDrop));
    leadBox.appendChild(el("div", "ledger-label", "DeepSeek 有效成本降幅"));
    leadBox.appendChild(el("div", "ledger-note", "Guarded 护栏将通过率从 43.3% 拉升至 86.7%，千篇成本降至 ¥11.35。"));

    const sampleBox = el("div", "ledger-cell");
    sampleBox.appendChild(el("div", "ledger-value", `${data.meta.validGenerations} / ${data.meta.totalGenerations}`));
    sampleBox.appendChild(el("div", "ledger-label", "真实采样与非零 Token 计价"));
    sampleBox.appendChild(el("div", "ledger-note", "6 个模型各跑 Baseline 与 Guarded 两套提示词，覆盖 40% 陷阱 Brief。"));

    const humanBox = el("div", "ledger-cell");
    humanBox.appendChild(
      el("div", "ledger-value", geminiL3 ? `${fmtPct(geminiL3.decisiveAgreementRate)} vs 0/8` : "81.8% vs 0/8")
    );
    humanBox.appendChild(
      el("div", "ledger-label", `${data.l3Human.annotatedCount} / ${data.l3Human.queueTotal} 题盲测（Self-κ 为 N/A）`)
    );
    humanBox.appendChild(
      el("div", "ledger-note", "人类分胜负的 11 题 Gemini 一致率 81.8%，人类判平的 8 题 AI 全员 0 判平，未达重测区间不虚报 κ。")
    );

    grid.replaceChildren(leadBox, sampleBox, consensusBox, humanBox);
  }

  function renderLeaderboard(data) {
    const variant = document.getElementById("filterVariant").value;
    const channel = document.getElementById("filterChannel").value;
    const industry = document.getElementById("filterIndustry").value;
    const sortBy = document.getElementById("sortMetric").value;

    const modelMap = new Map(data.models.map((m) => [m.id, m]));
    const winMap = new Map(data.l2.modelWinRates.map((w) => [w.modelId, w]));

    const rows = data.l1.v2.summaries
      .filter((s) => variant === "all" || s.promptVariant === variant)
      .map((s) => {
        const meta = modelMap.get(s.modelId);
        const winInfo = winMap.get(s.modelId);

        let slice = {
          total: s.total,
          overallPassRate: s.overallPassRate,
          compliancePassRate: s.compliancePassRate,
          factGroundingPassRate: s.factGroundingPassRate,
          formatPassRate: s.formatPassRate,
          avgSlopScore: s.avgSlopScore,
        };
        if (channel !== "all" && s.byChannel[channel]) {
          slice = s.byChannel[channel];
        } else if (industry !== "all" && s.byIndustry[industry]) {
          slice = s.byIndustry[industry];
        }

        const sliceEffectiveCost =
          channel === "all" && industry === "all"
            ? s.effectiveCostPer1kPassableCny
            : slice.overallPassRate > 0
              ? Number((s.rawCostPer1kCny / slice.overallPassRate).toFixed(2))
              : null;

        return {
          summary: s,
          meta,
          slice,
          sliceEffectiveCost,
          l2WinRate: winInfo ? winInfo.winRate : 0,
        };
      });

    rows.sort((a, b) => {
      if (sortBy === "effectiveCost") {
        const ca = a.sliceEffectiveCost ?? 1e9;
        const cb = b.sliceEffectiveCost ?? 1e9;
        return ca - cb;
      }
      if (sortBy === "l2WinRate") return b.l2WinRate - a.l2WinRate;
      if (sortBy === "slop") return a.slice.avgSlopScore - b.slice.avgSlopScore;
      if (b.slice.overallPassRate !== a.slice.overallPassRate) {
        return b.slice.overallPassRate - a.slice.overallPassRate;
      }
      return (a.sliceEffectiveCost ?? 1e9) - (b.sliceEffectiveCost ?? 1e9);
    });

    const tbody = document.getElementById("leaderboardBody");
    tbody.replaceChildren(
      ...rows.map((row) => {
        const tr = document.createElement("tr");
        const tier = row.meta ? row.meta.tier : "value";
        const label = row.meta ? row.meta.label : row.summary.modelId;

        const tdModel = document.createElement("td");
        tdModel.appendChild(el("strong", null, label));
        tr.appendChild(tdModel);

        const tdPass = document.createElement("td");
        const passCls =
          row.slice.overallPassRate >= 0.9
            ? "badge-pass"
            : row.slice.overallPassRate >= 0.7
              ? "badge-warn"
              : "badge-fail";
        tdPass.appendChild(el("span", `badge ${passCls}`, fmtPct(row.slice.overallPassRate)));
        tr.appendChild(tdPass);

        tr.appendChild(el("td", "num-strong", fmtCny(row.sliceEffectiveCost)));

        const tdWin = el(
          "td",
          row.summary.promptVariant === "guarded" ? null : "num-muted",
          row.summary.promptVariant === "guarded" ? fmtPct(row.l2WinRate) : "未参与"
        );
        tr.appendChild(tdWin);

        const tierLabels = { flagship: "旗舰档", value: "主力均衡", lite: "轻量经济" };
        const tdTier = document.createElement("td");
        tdTier.appendChild(el("span", `badge badge-${tier}`, tierLabels[tier] || tier));
        tr.appendChild(tdTier);

        const tdPrompt = document.createElement("td");
        tdPrompt.appendChild(
          el("span", `badge badge-${row.summary.promptVariant}`, row.summary.promptVariant)
        );
        tr.appendChild(tdPrompt);

        tr.appendChild(el("td", null, String(row.slice.total)));
        tr.appendChild(el("td", null, fmtPct(row.slice.compliancePassRate)));
        tr.appendChild(el("td", null, fmtPct(row.slice.factGroundingPassRate)));
        tr.appendChild(el("td", null, fmtPct(row.slice.formatPassRate)));
        tr.appendChild(el("td", null, `${row.slice.avgSlopScore.toFixed(1)} 分`));
        tr.appendChild(el("td", null, fmtCny(row.summary.rawCostPer1kCny)));

        return tr;
      })
    );
  }

  function renderParetoChart(data, tokens) {
    const wrap = document.getElementById("paretoChartWrap");
    const mobileList = document.getElementById("paretoMobileReadout");
    const W = 520;
    const H = 326;
    const pad = { top: 24, right: 28, bottom: 60, left: 54 };
    const plotW = W - pad.left - pad.right;
    const plotH = H - pad.top - pad.bottom;

    const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "成本质量帕累托散点图" });

    const minLog = Math.log10(4.5);
    const maxLog = Math.log10(180);
    const xForCost = (cost) => {
      const clamped = Math.max(4.5, Math.min(180, cost));
      return pad.left + ((Math.log10(clamped) - minLog) / (maxLog - minLog)) * plotW;
    };
    // 纵轴区间 [-0.08, 1.04] 让 0% 散点离开底轴线
    const yForWin = (winRate) => pad.top + ((1.04 - Math.max(-0.08, Math.min(1.04, winRate))) / 1.12) * plotH;

    [5, 10, 20, 40, 80, 150].forEach((tick) => {
      const x = xForCost(tick);
      svg.appendChild(
        svgEl("line", { x1: x, y1: pad.top, x2: x, y2: pad.top + plotH, stroke: tokens.line, "stroke-dasharray": "3 3" })
      );
      const lbl = svgEl("text", {
        x,
        y: pad.top + plotH + 22,
        "text-anchor": "middle",
        "font-size": 14,
        "font-family": tokens.fontMono,
        fill: tokens.inkMuted,
      });
      lbl.textContent = `¥${tick}`;
      svg.appendChild(lbl);
    });

    [0, 0.25, 0.5, 0.75, 1].forEach((tick) => {
      const y = yForWin(tick);
      svg.appendChild(svgEl("line", { x1: pad.left, y1: y, x2: pad.left + plotW, y2: y, stroke: tokens.line }));
      const lbl = svgEl("text", {
        x: pad.left - 8,
        y: y + 5,
        "text-anchor": "end",
        "font-size": 14,
        "font-family": tokens.fontMono,
        fill: tokens.inkMuted,
      });
      lbl.textContent = `${Math.round(tick * 100)}%`;
      svg.appendChild(lbl);
    });

    svg.appendChild(
      svgEl("line", { x1: pad.left, y1: pad.top + plotH, x2: pad.left + plotW, y2: pad.top + plotH, stroke: tokens.lineStrong })
    );

    const xAxisTitle = svgEl("text", {
      x: pad.left + plotW / 2,
      y: H - 6,
      "text-anchor": "middle",
      "font-size": 14,
      "font-family": tokens.fontBody,
      fill: tokens.inkMuted,
      "font-weight": 600,
    });
    xAxisTitle.textContent = "Guarded 千篇有效成本（元，对数刻度，越左越省钱）";
    svg.appendChild(xAxisTitle);

    const modelMap = new Map(data.models.map((m) => [m.id, m]));
    const winMap = new Map(data.l2.modelWinRates.map((w) => [w.modelId, w]));
    const points = data.l1.v2.summaries
      .filter((s) => s.promptVariant === "guarded" && s.effectiveCostPer1kPassableCny !== null)
      .map((s) => {
        const w = winMap.get(s.modelId);
        const m = modelMap.get(s.modelId);
        return {
          id: s.modelId,
          label: m ? m.label : s.modelId,
          tier: m ? m.tier : "value",
          cost: s.effectiveCostPer1kPassableCny,
          passRate: s.overallPassRate,
          winRate: w ? w.winRate : 0,
          appearances: w ? w.appearances : 0,
        };
      });

    const sortedByCost = [...points].sort((a, b) => a.cost - b.cost);
    const frontier = [];
    let bestWin = -1;
    for (const pt of sortedByCost) {
      if (pt.winRate >= bestWin) {
        bestWin = pt.winRate;
        frontier.push(pt);
      }
    }
    if (frontier.length >= 2) {
      const pathD = frontier
        .map((pt, i) => `${i === 0 ? "M" : "L"} ${xForCost(pt.cost).toFixed(1)} ${yForWin(pt.winRate).toFixed(1)}`)
        .join(" ");
      svg.appendChild(
        svgEl("path", {
          d: pathD,
          fill: "none",
          stroke: tokens.accent,
          "stroke-width": 2,
          "stroke-dasharray": "5 4",
        })
      );
    }

    const tierColors = {
      flagship: tokens.seriesBlue,
      value: tokens.accent,
      lite: tokens.seriesUmber,
    };
    const labelOffsets = {
      "glm-5.3-flash": { dx: 12, dy: 4, anchor: "start" },
      "minimax-m3.1-flash": { dx: 12, dy: -12, anchor: "start" },
      "deepseek-v4.1-flash": { dx: 12, dy: 4, anchor: "start" },
      "kimi-k3.1-pro": { dx: -12, dy: -8, anchor: "end" },
      "qwen3.8-max": { dx: 12, dy: 6, anchor: "start" },
      "claude-sonnet-5.5": { dx: -12, dy: -10, anchor: "end" },
    };

    for (const pt of points) {
      const cx = xForCost(pt.cost);
      const cy = yForWin(pt.winRate);
      const r = 6 + Math.round(pt.passRate * 5);
      const color = tierColors[pt.tier] || tokens.accent;
      const tipLines = [
        `${pt.label}（${pt.tier}）`,
        `L1 通过率：${fmtPct(pt.passRate)}`,
        `千篇有效成本：¥${pt.cost.toFixed(2)}`,
        `L2 胜率：${fmtPct(pt.winRate)}（${pt.appearances} 次出场）`,
      ];

      const circle = svgEl("circle", {
        cx,
        cy,
        r,
        fill: color,
        "fill-opacity": 0.9,
        stroke: tokens.paper,
        "stroke-width": 2,
        tabindex: 0,
        role: "button",
        "aria-label": tipLines.join("，"),
        style: "cursor:pointer;",
      });
      circle.addEventListener("mousemove", (evt) => showTooltip(evt, tipLines));
      circle.addEventListener("focus", () => showFocusTooltip(circle, tipLines));
      circle.addEventListener("mouseleave", hideTooltip);
      circle.addEventListener("blur", hideTooltip);
      svg.appendChild(circle);

      const off = labelOffsets[pt.id] || { dx: 12, dy: 4, anchor: "start" };
      const txt = svgEl("text", {
        x: cx + off.dx,
        y: cy + off.dy,
        "text-anchor": off.anchor,
        "font-size": 14,
        "font-family": tokens.fontBody,
        "font-weight": 700,
        fill: tokens.ink,
      });
      txt.textContent = pt.label;
      svg.appendChild(txt);
    }

    wrap.replaceChildren(svg);

    if (mobileList) {
      mobileList.replaceChildren(
        ...sortedByCost.map((pt) => {
          const row = el("div", "mobile-pareto-row");
          row.appendChild(el("strong", null, pt.label));
          row.appendChild(el("span", "num-muted", `¥${pt.cost.toFixed(2)} · 胜率 ${fmtPct(pt.winRate)}`));
          return row;
        })
      );
    }
  }

  function renderRoiChart(data) {
    const wrap = document.getElementById("roiChartWrap");
    const lifts = [...data.l1.v2.promptLifts].sort(
      (a, b) => b.passRateLiftPctPoints - a.passRateLiftPctPoints
    );
    const modelMap = new Map(data.models.map((m) => [m.id, m]));

    const header = el("div", "roi-header-row");
    header.appendChild(el("span", null, "模型"));
    header.appendChild(el("span", null, "通过率变化（百分点）"));
    header.appendChild(el("span", null, "千篇有效成本变化"));

    const rows = lifts.map((lift) => {
      const meta = modelMap.get(lift.modelId);
      const label = meta ? meta.label : lift.modelId;
      const row = el("div", "roi-row");

      const modelCol = el("div", null, null);
      modelCol.appendChild(el("span", "roi-model", label));
      modelCol.appendChild(
        el("span", "roi-submeta", `${fmtPct(lift.baselinePassRate)} 到 ${fmtPct(lift.guardedPassRate)}`)
      );
      row.appendChild(modelCol);

      // 柱 1：通过率百分点变化（蓝升、棕降，避免复用涨价红）
      const pp = lift.passRateLiftPctPoints;
      const ppPositive = pp >= 0;
      const ppCol = el("div", "roi-metric");
      const ppTop = el("div", "roi-metric-top");
      ppTop.appendChild(el("span", "roi-mobile-label", "通过率变化"));
      ppTop.appendChild(
        el("span", ppPositive ? "val-blue" : "val-warn", `${pp >= 0 ? "+" : ""}${pp.toFixed(1)}pp`)
      );
      ppCol.appendChild(ppTop);
      const ppTrack = el("div", "roi-track");
      const ppFill = el("div", ppPositive ? "roi-fill fill-blue" : "roi-fill fill-warn");
      ppFill.style.width = `${Math.max(4, Math.min(100, Math.round((Math.abs(pp) / 50) * 100)))}%`;
      ppTrack.appendChild(ppFill);
      ppCol.appendChild(ppTrack);
      row.appendChild(ppCol);

      // 柱 2：千篇有效成本变化（绿降本、红涨本）
      const deltaCostPct = lift.effectiveCostReductionPct === null ? null : -lift.effectiveCostReductionPct;
      const costCol = el("div", "roi-metric");
      const costTop = el("div", "roi-metric-top");
      costTop.appendChild(el("span", "roi-mobile-label", "有效成本变化"));
      if (deltaCostPct === null) {
        costTop.appendChild(el("span", "num-muted", "不适用"));
        costCol.appendChild(costTop);
      } else {
        const isCheaper = deltaCostPct <= 0;
        costTop.appendChild(
          el("span", isCheaper ? "val-ok" : "val-fail", `${deltaCostPct > 0 ? "+" : ""}${deltaCostPct.toFixed(1)}%`)
        );
        costCol.appendChild(costTop);
        const costTrack = el("div", "roi-track");
        const costFill = el("div", isCheaper ? "roi-fill fill-ok" : "roi-fill fill-fail");
        costFill.style.width = `${Math.max(4, Math.min(100, Math.round((Math.abs(deltaCostPct) / 60) * 100)))}%`;
        costTrack.appendChild(costFill);
        costCol.appendChild(costTrack);
      }
      row.appendChild(costCol);

      return row;
    });

    wrap.replaceChildren(header, ...rows);
  }

  function renderCalibration(data) {
    const flipWrap = document.getElementById("judgeFlipBars");
    flipWrap.replaceChildren(
      ...data.l2.judges.map((j) => {
        const row = el("div", "flip-bar-row");
        const head = el("div", "flip-bar-head");
        head.appendChild(el("span", null, `${j.label}（${j.evaluated} 对）`));
        head.appendChild(el("span", null, `位置翻转 ${j.flipCount} 次（${fmtPct(j.flipRate)}）`));
        row.appendChild(head);

        const track = el("div", "flip-track");
        const fill = el("div", j.flipRate > 0.15 ? "flip-fill flip-fill-high" : "flip-fill");
        fill.style.width = `${Math.min(100, Math.round(j.flipRate * 100))}%`;
        track.appendChild(fill);
        row.appendChild(track);
        return row;
      })
    );

    const cj = data.l2.crossJudge;
    document.getElementById("crossJudgeCallout").textContent =
      `交叉一致性（${cj.overlappingPairs} 对重叠）：含翻转总体一致率 ${fmtPct(cj.overallAgreementRate)}（κ = ${fmtKappa(cj.overallKappa)}），过滤位置翻转后 ${cj.nonFlippedPairs} 对共识样本一致率跃升至 ${fmtPct(cj.nonFlippedAgreementRate)}（κ = ${fmtKappa(cj.nonFlippedKappa)}）。`;

    document.getElementById("l3StatusNote").textContent =
      `已完成 ${data.l3Human.annotatedCount} / ${data.l3Human.queueTotal} 题双盲标注（选择分布 A=${data.l3Human.humanChoiceDist.A}，TIE=${data.l3Human.humanChoiceDist.TIE}，B=${data.l3Human.humanChoiceDist.B}）；前 19 题尚未进入间隔不小于 15 的隐藏重测区间，Self-Kappa 如实标为 N/A。`;

    document.getElementById("l3BreakdownBody").replaceChildren(
      ...data.l3Human.perJudge.map((j) => {
        const tr = document.createElement("tr");
        const tdName = el("td", null, j.label);
        tdName.setAttribute("data-label", "裁判");
        tr.appendChild(tdName);

        const tdAgree = el("td", null, fmtPct(j.overallAgreement));
        tdAgree.setAttribute("data-label", "总一致");
        tr.appendChild(tdAgree);

        const tdKappa = el("td", null, fmtKappa(j.overallKappa));
        tdKappa.setAttribute("data-label", "整体κ");
        tr.appendChild(tdKappa);

        const tdTie = el("td", null, `${j.judgeTieOnHumanTie}/${j.humanTiePairs}`);
        tdTie.setAttribute("data-label", "判平(8)");
        tr.appendChild(tdTie);

        const tdDec = el(
          "td",
          "num-strong",
          `${j.decisiveAgreementCount}/${j.humanDecisivePairs}（${fmtPct(j.decisiveAgreementRate)}）`
        );
        tdDec.setAttribute("data-label", "胜负(11)");
        tr.appendChild(tdDec);

        const tdSelf = el("td", "num-muted", "N/A");
        tdSelf.setAttribute("data-label", "Self-κ");
        tr.appendChild(tdSelf);

        return tr;
      })
    );

    document.getElementById("l1FixesBody").replaceChildren(
      ...data.l1.calibrationFixes.map((fix) => {
        const tr = document.createElement("tr");
        const tdIssue = el("td", null, fix.issue);
        tdIssue.setAttribute("data-label", "误杀类型");
        const tdEx = el("td", null, fix.example);
        tdEx.setAttribute("data-label", "真实语料样例");
        const tdRes = el("td", null, fix.resolution);
        tdRes.setAttribute("data-label", "v2 修复方案");
        tr.appendChild(tdIssue);
        tr.appendChild(tdEx);
        tr.appendChild(tdRes);
        return tr;
      })
    );

    document.getElementById("boundariesList").replaceChildren(
      ...data.meta.evidenceBoundaries.map((b) => el("li", null, b))
    );
  }

  function renderBadCases(data) {
    const filterWrap = document.getElementById("badCaseFilters");
    const listWrap = document.getElementById("badCasesList");

    const cats = new Map();
    cats.set("all", `全部（${data.badCases.length}）`);
    for (const c of data.badCases) {
      const count = data.badCases.filter((x) => x.category === c.category).length;
      cats.set(c.category, `${c.categoryLabel}（${count}）`);
    }

    let activeCategory = "all";

    function paint() {
      filterWrap.replaceChildren(
        ...[...cats.entries()].map(([key, label]) => {
          const btn = el("button", `pill-btn${activeCategory === key ? " active" : ""}`, label);
          btn.type = "button";
          btn.setAttribute("aria-pressed", activeCategory === key ? "true" : "false");
          btn.onclick = () => {
            activeCategory = key;
            paint();
          };
          return btn;
        })
      );

      const filtered =
        activeCategory === "all"
          ? data.badCases
          : data.badCases.filter((c) => c.category === activeCategory);

      listWrap.replaceChildren(
        ...filtered.map((c, idx) => {
          const item = el("details", "case-item");
          item.open = idx === 0;

          const head = el("summary", "case-summary");
          const left = el("div", "case-head-main");

          const catBadgeCls =
            c.category === "l1_false_positive_fix"
              ? "badge-pass"
              : c.category === "judge_flip" || c.category === "judge_anti_tie"
                ? "badge-warn"
                : "badge-fail";
          const metaRow = el("div", "case-tags");
          metaRow.appendChild(el("span", `badge ${catBadgeCls}`, c.categoryLabel));
          metaRow.appendChild(el("span", "badge badge-baseline", c.briefId));
          metaRow.appendChild(el("span", "badge badge-baseline", c.channel));
          metaRow.appendChild(el("span", "badge badge-baseline", c.modelId));
          if (c.secondaryModelId) {
            metaRow.appendChild(el("span", "badge badge-baseline", `vs ${c.secondaryModelId}`));
          }
          if (c.promptVariant) {
            metaRow.appendChild(el("span", `badge badge-${c.promptVariant}`, c.promptVariant));
          }
          left.appendChild(metaRow);
          left.appendChild(el("div", "case-title-line", c.headline));
          head.appendChild(left);

          const toggle = el("span", "case-toggle-label", item.open ? "收起详情" : "展开详情");
          head.appendChild(toggle);
          item.addEventListener("toggle", () => {
            toggle.textContent = item.open ? "收起详情" : "展开详情";
          });
          item.appendChild(head);

          const detail = el("div", "case-detail");
          if (c.category === "compliance_footer_leak" && c.snippetA.endsWith("…")) {
            detail.appendChild(
              el(
                "p",
                "snippet-context-note",
                "说明：下方文本框展示正文首段节选；本例触发拦截的违禁原词位于正文末尾的审校附注中，具体命中原文见下方红字信号。"
              )
            );
          }

          const snippetsGrid = el("div", `snippets-grid${c.snippetB ? " dual" : ""}`);
          snippetsGrid.appendChild(el("div", "snippet-box", c.snippetA));
          if (c.snippetB) {
            snippetsGrid.appendChild(el("div", "snippet-box", c.snippetB));
          }
          detail.appendChild(snippetsGrid);

          const ul = el("ul", "signals-list");
          c.signals.forEach((sig) => ul.appendChild(el("li", null, sig)));
          detail.appendChild(ul);

          detail.appendChild(el("div", "takeaway-box", `运营结论：${c.takeaway}`));
          item.appendChild(detail);
          return item;
        })
      );
    }

    paint();
  }

  async function init() {
    const backLink = document.getElementById("backPortfolioLink");
    if (backLink) {
      fetch("../data/portfolio.json", { method: "HEAD" })
        .then((r) => {
          if (r.ok) backLink.hidden = false;
        })
        .catch(() => {});
    }

    const res = await fetch("./data/benchmark-snapshot.json");
    if (!res.ok) {
      throw new Error(`无法加载看板快照（${res.status}）`);
    }
    const data = await res.json();
    const tokens = readThemeTokens();

    renderHero(data);
    renderLeaderboard(data);
    renderParetoChart(data, tokens);
    renderRoiChart(data);
    renderCalibration(data);
    renderBadCases(data);

    ["filterVariant", "filterChannel", "filterIndustry", "sortMetric"].forEach((id) => {
      document.getElementById(id).addEventListener("change", () => renderLeaderboard(data));
    });

    document.getElementById("footerGeneratedAt").textContent =
      `数据快照生成时间：${data.meta.generatedAt.slice(0, 19).replace("T", " ")} UTC`;
  }

  init().catch((err) => {
    const main = document.querySelector("main");
    const box = el("div", "callout-strip", `加载评测数据失败：${err.message}`);
    main.prepend(box);
  });
})();
